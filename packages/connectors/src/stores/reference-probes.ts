import type { Coverage } from '@cesta/core';
import { newStoreContext, openAndCheck } from '../shared/browser.js';
import { BLOCK_LABEL } from '../shared/block-detect.js';
import { normalizeName, unknownTerms, type StoreProbe } from '../shared/probe.js';

// Lidl y Aldi no venden la compra básica online: solo sirven como referencia de folleto.

/**
 * ¿Hay el producto básico buscado entre los resultados? Lidl.es vende bazar y,
 * puntualmente, algún artículo gourmet (p. ej. una cuña de queso), pero no la
 * compra básica. Se considera "básico encontrado" si un título empieza por el término.
 */
export function classifyLidlSearch(query: string, names: string[]): { staples: string[]; others: string[] } {
  const q = normalizeName(query);
  const staples = names.filter((n) => normalizeName(n).startsWith(q));
  return { staples, others: names.filter((n) => !staples.includes(n)) };
}

export const lidlProbe: StoreProbe = {
  id: 'lidl',
  async checkCoverage(ctx, env): Promise<Coverage> {
    const checkedAt = env.now().toISOString();
    const base = { storeId: 'lidl' as const, cp: ctx.cp, checkedAt };
    const context = await newStoreContext(await env.browser());
    try {
      const page = await context.newPage();
      const open = await openAndCheck(page, 'https://www.lidl.es/q/search?q=leche', 6000);
      if (open.blockedBy) {
        return { ...base, status: 'unknown', source: 'none', blockedBy: open.blockedBy, evidence: `HTTP ${open.status}`, reason: BLOCK_LABEL[open.blockedBy] };
      }
      const names = await page
        .locator('[data-qa-label="product-grid-box-title"]')
        .allInnerTexts()
        .catch(() => [] as string[]);
      const { staples, others } = classifyLidlSearch('leche', names.map((n) => n.trim()).filter(Boolean));
      if (names.length && staples.length === 0) {
        return {
          ...base,
          status: 'bazaar_only',
          source: 'live',
          evidence: `Búsqueda "leche": ${names.length} resultados y ninguno es leche (p. ej. "${others.slice(0, 4).join('", "')}")`,
        };
      }
      return {
        ...base,
        status: 'unknown',
        source: 'none',
        evidence: names.length ? `Aparece leche: ${staples.slice(0, 3).join(', ')}` : 'No se pudieron leer los resultados',
        reason: 'Revisar a mano si Lidl ha empezado a vender alimentación básica online',
      };
    } finally {
      await context.close();
    }
  },
  async getDeliveryTerms(ctx, env) {
    return unknownTerms('lidl', ctx.cp, env.now().toISOString(), 'No aplica: sin alimentación online.');
  },
};

export const aldiProbe: StoreProbe = {
  id: 'aldi',
  async checkCoverage(ctx, env): Promise<Coverage> {
    const checkedAt = env.now().toISOString();
    const base = { storeId: 'aldi' as const, cp: ctx.cp, checkedAt };
    const context = await newStoreContext(await env.browser());
    try {
      const page = await context.newPage();
      const open = await openAndCheck(page, 'https://www.aldi.es/', 5000);
      if (open.blockedBy) {
        return { ...base, status: 'unknown', source: 'none', blockedBy: open.blockedBy, evidence: `HTTP ${open.status}`, reason: BLOCK_LABEL[open.blockedBy] };
      }
      const html = await page.content();
      const hasCart = /añadir al carrito|a[ñn]adir a la cesta|mi carrito|checkout/i.test(html);
      return hasCart
        ? { ...base, status: 'unknown', source: 'none', evidence: 'La web muestra elementos de carrito', reason: 'Revisar a mano si Aldi tiene ahora compra online' }
        : { ...base, status: 'no_online', source: 'live', evidence: 'La web no tiene carrito ni compra online (solo ofertas y folleto por región)' };
    } finally {
      await context.close();
    }
  },
  async getDeliveryTerms(ctx, env) {
    return unknownTerms('aldi', ctx.cp, env.now().toISOString(), 'No aplica: sin compra online.');
  },
};
