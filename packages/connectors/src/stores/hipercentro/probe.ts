import type { Coverage, DeliveryContext, DeliveryTerms } from '@cesta/core';
import type { Page } from 'playwright';
import { dismissCookies, newStoreContext, openAndCheck } from '../../shared/browser.js';
import { BLOCK_LABEL } from '../../shared/block-detect.js';
import { normalizeName, parseEuro, unknownTerms, type StoreProbe } from '../../shared/probe.js';

const HOME = 'https://tuhiper.com/a19/inicio.aspx';

export interface TownOption {
  value: string;
  label: string;
}

/**
 * Hiper Centro reparte por población, no por CP. Elige la opción de su lista
 * que corresponde al CP/población del perfil. `null` = la población no está en la lista.
 */
export function pickTownOption(cp: string, town: string | undefined, options: TownOption[]): TownOption | null {
  const n = Number(cp);
  // La propia web agrupa "Palma Ciudad y Alrededores (07000-07015)".
  if (n >= 7000 && n <= 7015) {
    return options.find((o) => /palma ciudad/i.test(o.label)) ?? null;
  }
  if (!town) return null;
  const target = normalizeName(town);
  return (
    options.find((o) => normalizeName(o.label) === target) ??
    options.find((o) => normalizeName(o.label).split(' ').includes(target) && !/,/.test(o.label)) ??
    null
  );
}

/** Lee "Gastos del Servicio Standard: 6,95€" y "Sin importe mínimo de compra". */
export function parseLoginPageTerms(cp: string, text: string, checkedAt: string, sourceUrl: string): DeliveryTerms {
  const flat = text.replace(/\s+/g, ' ');
  const costText = flat.match(/Gastos del Servicio Standard:\s*([\d.,]+\s*€)/i)?.[1];
  const baseCost = costText ? parseEuro(costText) : null;
  return {
    storeId: 'hipercentro',
    cp,
    baseCost,
    minOrder: /sin importe m[ií]nimo de compra/i.test(flat) ? 0 : null,
    freeFrom: null,
    slots: /menos de 3 horas/i.test(flat) ? [{ label: 'en menos de 3 horas, todos los días' }] : [],
    loginToSeePrices: /Te registras al confirmar tu pedido/i.test(flat) ? false : null,
    source: baseCost !== null ? 'live' : 'none',
    sourceUrl,
    checkedAt,
    notes: 'Pago a la entrega (efectivo o tarjeta). Acceso de cliente con móvil + clave de 4 dígitos.',
  };
}

async function openTownList(page: Page): Promise<TownOption[]> {
  await page.getByText('Mallorca', { exact: true }).first().click();
  await page.locator('select[name=LbCP]').waitFor({ state: 'attached', timeout: 15_000 });
  return page.$$eval('select[name=LbCP] option', (os) =>
    os.map((o) => ({ value: (o as HTMLOptionElement).value, label: (o.textContent ?? '').trim() })),
  );
}

async function selectTown(page: Page, ctx: DeliveryContext) {
  const open = await openAndCheck(page, HOME, 2000);
  if (open.blockedBy) return { blocked: open, option: null, options: [] as TownOption[] };
  await dismissCookies(page);
  const options = await openTownList(page);
  const option = pickTownOption(ctx.cp, ctx.town, options);
  if (option) {
    await page.locator('select[name=LbCP]').selectOption(option.value);
    await page.waitForURL(/Login\.aspx/i, { timeout: 20_000 });
    await page.waitForTimeout(1500);
  }
  return { blocked: null, option, options };
}

export const hipercentroProbe: StoreProbe = {
  id: 'hipercentro',

  async checkCoverage(ctx, env): Promise<Coverage> {
    const checkedAt = env.now().toISOString();
    const base = { storeId: 'hipercentro' as const, cp: ctx.cp, checkedAt };
    const context = await newStoreContext(await env.browser());
    try {
      const page = await context.newPage();
      const { blocked, option, options } = await selectTown(page, ctx);
      if (blocked) {
        return { ...base, status: 'unknown', source: 'none', blockedBy: blocked.blockedBy!, evidence: `HTTP ${blocked.status}`, reason: BLOCK_LABEL[blocked.blockedBy!] };
      }
      if (!option) {
        return {
          ...base,
          status: options.length ? 'no_delivery' : 'unknown',
          source: options.length ? 'live' : 'none',
          evidence: `"${ctx.town ?? ctx.cp}" no figura entre ${options.length} poblaciones de Mallorca`,
          reason: options.length ? undefined : 'No se pudo leer la lista de poblaciones',
        };
      }
      return {
        ...base,
        status: 'delivers',
        pickup: true,
        source: 'live',
        evidence: `Población "${option.label}" (id ${option.value}) en el selector de entrega de Mallorca`,
        storeRef: { townId: option.value, townLabel: option.label },
      };
    } finally {
      await context.close();
    }
  },

  async getDeliveryTerms(ctx, env): Promise<DeliveryTerms> {
    const checkedAt = env.now().toISOString();
    const context = await newStoreContext(await env.browser());
    try {
      const page = await context.newPage();
      const { blocked, option } = await selectTown(page, ctx);
      if (blocked) return unknownTerms('hipercentro', ctx.cp, checkedAt, BLOCK_LABEL[blocked.blockedBy!]);
      if (!option) return unknownTerms('hipercentro', ctx.cp, checkedAt, 'Población sin servicio o no encontrada');
      const text = await page.locator('body').innerText();
      return parseLoginPageTerms(ctx.cp, text, checkedAt, page.url());
    } finally {
      await context.close();
    }
  },
};
