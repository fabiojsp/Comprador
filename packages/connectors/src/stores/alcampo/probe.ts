import type { Coverage, DeliveryContext, DeliveryTerms } from '@cesta/core';
import type { Page } from 'playwright';
import { dismissCookies, newStoreContext, openAndCheck } from '../../shared/browser.js';
import { BLOCK_LABEL } from '../../shared/block-detect.js';
import { parseEuro, unknownTerms, type ProbeEnv, type StoreProbe } from '../../shared/probe.js';

const BASE = 'https://www.compraonline.alcampo.es';
export const TERMS_URL = `${BASE}/content/servicios-entrega-recogida`;

interface DeliveryAddressResponse {
  postalCode?: string;
  deliverability?: string;
  deliveryMethod?: string;
  resolvedRegionId?: string;
  formattedAddress?: string;
}

export function parseDeliverability(cp: string, d: DeliveryAddressResponse, pickup: boolean, checkedAt: string): Coverage {
  const base = { storeId: 'alcampo' as const, cp, checkedAt, source: 'live' as const };
  const evidence = `deliverability=${d.deliverability} método=${d.deliveryMethod} dirección="${d.formattedAddress ?? ''}"`;
  const storeRef = d.resolvedRegionId ? { regionId: d.resolvedRegionId } : undefined;
  if (d.deliverability === 'DELIVERABLE' && d.deliveryMethod === 'HOME_DELIVERY') {
    return { ...base, status: 'delivers', pickup, evidence, storeRef };
  }
  if (d.deliverability === 'NOT_DELIVERABLE') {
    return { ...base, status: pickup ? 'pickup_only' : 'no_delivery', pickup, evidence, storeRef };
  }
  return { ...base, status: 'unknown', source: 'none', evidence, reason: 'Estado de entrega no reconocido' };
}

/**
 * Lee la tarifa "Nacional" (fuera de Madrid) de la página oficial de servicios de entrega.
 * El texto tiene bloques Madrid → Nacional; nos quedamos con el primer importe tras "Nacional".
 */
export function parseTermsPage(cp: string, text: string, checkedAt: string): DeliveryTerms {
  const flat = text.replace(/\s+/g, ' ');
  const nacional = flat.split(/\bNacional\b/)[1] ?? '';
  const nextDay = nacional.match(/Env[ií]o a domicilio al d[ií]a siguiente y posteriores ([\d.,]+ ?€)/i)?.[1];
  const sameDay = nacional.match(/Env[ií]o mismo d[ií]a ([\d.,]+ ?€)/i)?.[1];
  const noMin = /sin importe m[ií]nimo/i.test(flat);
  const baseCost = nextDay ? parseEuro(nextDay) : null;

  return {
    storeId: 'alcampo',
    cp,
    baseCost,
    minOrder: noMin ? 0 : null,
    freeFrom: null,
    slots: [
      { label: 'día siguiente o posterior (7:00–22:00)', from: '07:00', to: '22:00', cost: baseCost ?? undefined },
      ...(sameDay ? [{ label: 'mismo día', cost: parseEuro(sameDay) ?? undefined }] : []),
    ],
    loginToSeePrices: false,
    source: baseCost !== null ? 'official_doc' : 'none',
    sourceUrl: TERMS_URL,
    checkedAt,
    notes:
      'Tarifa "Nacional" de la página oficial. La web avisa de que el coste varía según franja y día: el importe real se confirma al elegir franja.',
  };
}

async function readCoverageViaUi(page: Page, ctx: DeliveryContext): Promise<{ resp: DeliveryAddressResponse | null; pickup: boolean }> {
  let resp: DeliveryAddressResponse | null = null;
  page.on('response', async (r) => {
    if (!/\/api\/ecomdeliverydestinations\/v4\/delivery-addresses\//.test(r.url())) return;
    const json = (await r.json().catch(() => null)) as DeliveryAddressResponse | null;
    if (json?.postalCode === ctx.cp) resp = json;
  });

  // La cobertura se resuelve por dirección geocodificada: probamos varias formas de la dirección.
  const queries = [ctx.address, `${ctx.cp} ${ctx.town ?? ''}`.trim(), ctx.town ? `Carrer Major ${ctx.town}` : null].filter(
    (q): q is string => !!q,
  );
  for (const [i, q] of queries.entries()) {
    // Cada intento parte de la portada recién cargada: el diálogo de direcciones no se deja reiniciar bien.
    if (i > 0) {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
    }
    await page.getByRole('button', { name: /^\d{5}$/ }).first().click().catch(() => page.getByText(/^\d{5}$/).first().click());
    await page.getByRole('button', { name: /Cambiar el método de entrega/ }).click();
    const input = page.getByPlaceholder('Busca tu dirección');
    await input.fill(q);
    await page.waitForTimeout(2500);
    const suggestion = page.locator('[role=dialog] li, [role=option]').filter({ hasText: ctx.town ?? ctx.cp }).first();
    if (!(await suggestion.isVisible().catch(() => false))) continue;
    await suggestion.click();
    await page.waitForTimeout(3000);
    const confirm = page.getByRole('button', { name: /Confirmar ubicaci[oó]n/ });
    if (!(await confirm.isEnabled().catch(() => false))) continue;
    await confirm.click();
    await page.waitForTimeout(5000);
    if (resp) {
      const dialog = await page.locator('[role=dialog]').last().innerText().catch(() => '');
      return { resp, pickup: /Recogida/i.test(dialog) };
    }
  }
  return { resp, pickup: false };
}

export const alcampoProbe: StoreProbe = {
  id: 'alcampo',

  async checkCoverage(ctx, env) {
    const checkedAt = env.now().toISOString();
    const context = await newStoreContext(await env.browser());
    try {
      const page = await context.newPage();
      const open = await openAndCheck(page, `${BASE}/`, 5000);
      if (open.blockedBy) {
        return {
          storeId: 'alcampo', cp: ctx.cp, status: 'unknown', source: 'none', checkedAt,
          blockedBy: open.blockedBy, evidence: `HTTP ${open.status} "${open.title}"`, reason: BLOCK_LABEL[open.blockedBy],
        };
      }
      await dismissCookies(page);
      const { resp, pickup } = await readCoverageViaUi(page, ctx);
      if (!resp) {
        return {
          storeId: 'alcampo', cp: ctx.cp, status: 'unknown', source: 'none', checkedAt,
          evidence: 'El buscador de direcciones no resolvió ninguna dirección para el CP',
          reason: 'Dirección no geocodificada: indicar la dirección completa del perfil',
        };
      }
      return parseDeliverability(ctx.cp, resp, pickup, checkedAt);
    } finally {
      await context.close();
    }
  },

  async getDeliveryTerms(ctx, env) {
    const checkedAt = env.now().toISOString();
    const context = await newStoreContext(await env.browser());
    try {
      const page = await context.newPage();
      const open = await openAndCheck(page, TERMS_URL, 5000);
      if (open.blockedBy) return unknownTerms('alcampo', ctx.cp, checkedAt, BLOCK_LABEL[open.blockedBy]);
      const text = await page.locator('main').innerText().catch(() => page.locator('body').innerText());
      return parseTermsPage(ctx.cp, text, checkedAt);
    } finally {
      await context.close();
    }
  },
};
