import type { StoreId } from '@cesta/core';
import { newStoreContext, openAndCheck } from '../shared/browser.js';
import { BLOCK_LABEL } from '../shared/block-detect.js';
import { unknownTerms, type StoreProbe } from '../shared/probe.js';

/**
 * Sondeo para tiendas cuya web bloquea IPs de centro de datos (Carrefour, Eroski, ECI).
 * Solo comprueba si la web es accesible desde la red actual. La cobertura por CP
 * la resuelve el conector completo (Fases 1–2) ejecutado en el worker de casa.
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
            reason: `${BLOCK_LABEL[open.blockedBy]} desde esta red. Verificar con el worker de casa (Mac).`,
          };
        }
        return {
          storeId: id, cp: ctx.cp, status: 'unknown', source: 'none', checkedAt,
          evidence: `Web accesible desde esta red (HTTP ${open.status}, "${open.title}")`,
          reason: 'Web accesible; la comprobación por CP llega con el conector completo.',
        };
      } finally {
        await context.close();
      }
    },
    async getDeliveryTerms(ctx, env) {
      return unknownTerms(id, ctx.cp, env.now().toISOString(), 'Pendiente del conector completo (worker de casa).');
    },
  };
}
