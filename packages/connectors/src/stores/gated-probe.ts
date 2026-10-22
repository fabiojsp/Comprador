import type { StoreId } from '@cesta/core';
import { newStoreContext, openAndCheck } from '../shared/browser.js';
import { BLOCK_LABEL } from '../shared/block-detect.js';
import { unknownTerms, type StoreProbe } from '../shared/probe.js';

/**
 * Sondeo para tiendas cuya web bloquea servidores en la nube (Carrefour, Eroski, ECI).
 * Solo comprueba si la web es accesible desde la red actual. Están fuera del alcance
 * de la versión simple (SPEC.md); el sondeo sirve para detectar si eso cambia.
 */
export function gatedProbe(id: StoreId, homeUrl: string): StoreProbe {
  return {
    id,
    async checkCoverage(ctx, env) {
      const checkedAt = env.now().toISOString();
      const context = await newStoreContext(await env.browser());
      try {
        const page = await context.newPage();
        const open = await openAndCheck(page, homeUrl, 8000);
        if (open.blockedBy) {
          return {
            storeId: id, cp: ctx.cp, status: 'unknown', source: 'none', checkedAt,
            blockedBy: open.blockedBy,
            evidence: `HTTP ${open.status ?? '—'} "${open.title}"`,
            reason: `${BLOCK_LABEL[open.blockedBy]} desde esta red.`,
          };
        }
        return {
          storeId: id, cp: ctx.cp, status: 'unknown', source: 'none', checkedAt,
          evidence: `Web accesible desde esta red (HTTP ${open.status}, "${open.title}")`,
          reason: 'Web accesible desde esta red: se podría reconsiderar incluir la tienda.',
        };
      } finally {
        await context.close();
      }
    },
    async getDeliveryTerms(ctx, env) {
      return unknownTerms(id, ctx.cp, env.now().toISOString(), 'Tienda fuera del alcance actual.');
    },
  };
}
