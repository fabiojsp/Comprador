import type { Coverage, DeliveryContext, DeliveryTerms } from '@cesta/core';
import { httpRequest } from '../../shared/http.js';
import { parseEuro, unknownTerms, type ProbeEnv, type StoreProbe } from '../../shared/probe.js';

const BASE = 'https://tienda.mercadona.es';
/** Centro de ayuda oficial (Zendesk). Su API pública devuelve el texto y la fecha de edición. */
const HELP_API = 'https://ayuda.tienda.mercadona.es/api/v2/help_center/es/articles';
export const HELP_ARTICLES = {
  deliveryCost: '360000857071', // "Coste de preparación"
  minOrder: '360000841092', // "Pedido mínimo"
  slots: '360000840672', // "Tramos disponibles y horarios de reparto"
} as const;

/** Interpreta la respuesta de PUT /api/postal-codes/actions/change-pc/. */
export function parseCoverageResponse(
  cp: string,
  status: number,
  warehouse: string | null,
  body: string,
  checkedAt: string,
): Coverage {
  const base = { storeId: 'mercadona' as const, cp, checkedAt };
  if (status === 200 && warehouse) {
    return {
      ...base,
      status: 'delivers',
      source: 'live',
      evidence: `API change-pc → 200, almacén ${warehouse}`,
      storeRef: { warehouse },
    };
  }
  if (status === 404 && /outside of our working area/i.test(body)) {
    return { ...base, status: 'no_delivery', source: 'live', evidence: `API change-pc → 404 "${body.slice(0, 80)}"` };
  }
  return {
    ...base,
    status: 'unknown',
    source: 'none',
    evidence: `API change-pc → ${status}`,
    reason: 'Respuesta inesperada de la API de Mercadona',
    blockedBy: status === 403 ? 'akamai' : 'http_error',
  };
}

export interface HelpArticle {
  id: string;
  title: string;
  body: string;
  edited_at: string;
  html_url: string;
}

/** Extrae coste, mínimo y franjas de los artículos oficiales de ayuda. */
export function parseDeliveryTermsFromHelp(
  cp: string,
  articles: { deliveryCost?: HelpArticle; minOrder?: HelpArticle; slots?: HelpArticle },
  checkedAt: string,
): DeliveryTerms {
  const text = (a?: HelpArticle) => (a ? a.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '');
  const costText = text(articles.deliveryCost).match(/coste de preparaci[oó]n es de ([^.]+)/i)?.[1] ?? '';
  const minText = text(articles.minOrder).match(/pedido m[ií]nimo es de ([^.]+)/i)?.[1] ?? '';
  const slotsText = text(articles.slots);
  const hours = slotsText.match(/de (\d{1,2}:\d{2}) a (\d{1,2}:\d{2}) horas/i);

  const baseCost = parseEuro(costText);
  const minOrder = parseEuro(minText);
  const sources = Object.values(articles)
    .filter((a): a is HelpArticle => !!a)
    .map((a) => `${a.title} (editado ${a.edited_at.slice(0, 10)})`);

  return {
    storeId: 'mercadona',
    cp,
    baseCost,
    minOrder,
    // Ninguna FAQ oficial menciona un umbral de envío gratis: se deja sin dato.
    freeFrom: null,
    slots: hours ? [{ label: 'lunes a sábado, tramos de 1 o 2 h', from: hours[1], to: hours[2] }] : [],
    loginToSeePrices: false,
    source: baseCost !== null || minOrder !== null ? 'official_doc' : 'none',
    sourceUrl: articles.deliveryCost?.html_url,
    checkedAt,
    notes: `Fuentes: ${sources.join('; ') || 'ninguna'}. Coste igual para todos los CP con servicio según la FAQ.`,
  };
}

export const mercadonaProbe: StoreProbe = {
  id: 'mercadona',

  async checkCoverage(ctx: DeliveryContext, env: ProbeEnv): Promise<Coverage> {
    const checkedAt = env.now().toISOString();
    try {
      const res = await httpRequest(`${BASE}/api/postal-codes/actions/change-pc/`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ new_postal_code: ctx.cp }),
      });
      return parseCoverageResponse(ctx.cp, res.status, res.headers.get('x-customer-wh'), res.text, checkedAt);
    } catch (err) {
      return {
        storeId: 'mercadona',
        cp: ctx.cp,
        status: 'unknown',
        source: 'none',
        checkedAt,
        evidence: String(err),
        blockedBy: 'network',
        reason: 'Sin respuesta de red',
      };
    }
  },

  async getDeliveryTerms(ctx: DeliveryContext, env: ProbeEnv): Promise<DeliveryTerms> {
    const checkedAt = env.now().toISOString();
    try {
      const entries = await Promise.all(
        Object.entries(HELP_ARTICLES).map(async ([key, id]) => {
          const res = await httpRequest(`${HELP_API}/${id}.json`);
          if (res.status !== 200) return [key, undefined] as const;
          return [key, (JSON.parse(res.text) as { article: HelpArticle }).article] as const;
        }),
      );
      return parseDeliveryTermsFromHelp(ctx.cp, Object.fromEntries(entries), checkedAt);
    } catch (err) {
      return unknownTerms('mercadona', ctx.cp, checkedAt, `No se pudo leer el centro de ayuda: ${String(err)}`);
    }
  },
};
