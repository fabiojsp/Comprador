// Atajo del iPhone (SPEC §2): para tiendas que bloquean la nube (Carrefour, Eroski),
// la app abre la web de la tienda en Safari con un "plan" en el hash de la URL y el
// atajo ejecuta en esa página un script fijo que descarga las búsquedas del plan con
// la conexión del usuario y devuelve las respuestas en bruto. El servidor las interpreta.
//
// Toda la lógica específica de cada tienda vive aquí (servidor): el script del atajo
// no cambia aunque cambie la web de la tienda.

import type { StoreId } from '@cesta/core';

export type ShortcutStoreId = Extract<StoreId, 'carrefour' | 'eroski'>;

export interface ShortcutStoreConfig {
  /** Página donde se abre Safari (la tienda en sí). */
  start: string;
  /** Plantilla de búsqueda: `{q}` se sustituye por la búsqueda codificada. */
  search: string;
  /** Páginas extra para leer condiciones de envío o diagnosticar (sin recortar scripts). */
  extras: string[];
}

// Primera versión: URLs a confirmar con la primera captura real (docs/FRAGILIDAD.md).
export const SHORTCUT_STORES: Record<ShortcutStoreId, ShortcutStoreConfig> = {
  carrefour: {
    start: 'https://www.carrefour.es/supermercado',
    search: 'https://www.carrefour.es/search-api/query/v1/search?query={q}&scope=mobile&lang=es&rows=24&start=0&origin=default&f.op=OR',
    extras: ['https://www.carrefour.es/supermercado'],
  },
  eroski: {
    start: 'https://supermercado.eroski.es/es/',
    search: 'https://supermercado.eroski.es/es/search/results/?q={q}&suggestionsFilter=false',
    extras: ['https://supermercado.eroski.es/es/supermercado/envio/'],
  },
};

export const isShortcutStore = (id: string): id is ShortcutStoreId => id in SHORTCUT_STORES;

/** Lo que viaja en el hash de la URL hacia el script del atajo. */
export interface ShortcutPlan {
  /** Versión del formato. */
  v: 1;
  /** Token de un solo uso que autoriza el envío de vuelta. */
  t: string;
  s: ShortcutStoreId;
  /** Plantilla de búsqueda. */
  tpl: string;
  /** Búsquedas. */
  q: string[];
  /** Páginas extra. */
  x: string[];
}

export const HASH_KEY = 'cesta=';

function toBase64Url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): string {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

export function buildPlan(store: ShortcutStoreId, token: string, queries: string[]): ShortcutPlan {
  const cfg = SHORTCUT_STORES[store];
  return { v: 1, t: token, s: store, tpl: cfg.search, q: [...new Set(queries)], x: cfg.extras };
}

/** URL que abre la app en Safari: la tienda + el plan en el hash (el hash nunca llega al servidor de la tienda). */
export function planUrl(plan: ShortcutPlan): string {
  return `${SHORTCUT_STORES[plan.s].start}#${HASH_KEY}${toBase64Url(JSON.stringify(plan))}`;
}

/** Una respuesta capturada por el atajo. */
export interface CapturedPage {
  /** Búsqueda (o null en páginas extra). */
  q: string | null;
  url: string;
  status: number;
  /** content-type de la respuesta. */
  ct: string;
  /** Cuerpo (recortado en el iPhone). */
  body: string;
  /** El cuerpo se recortó por tamaño. */
  cut?: boolean;
  error?: string;
}

/** Lo que el atajo envía de vuelta. */
export interface CapturePayload {
  v: 1;
  t: string;
  s: ShortcutStoreId;
  /** Página donde se ejecutó el script (para comprobar la tienda). */
  at: string;
  ua: string;
  pages: CapturedPage[];
  ms: number;
}

const MAX_PAGES = 120;
const MAX_BODY = 400_000;

/** Valida la forma del envío del atajo. Devuelve un mensaje de error o null. */
export function validatePayload(p: unknown): string | null {
  if (!p || typeof p !== 'object') return 'Cuerpo vacío o no es JSON';
  const x = p as Partial<CapturePayload>;
  if (x.v !== 1) return 'Versión de formato desconocida';
  if (typeof x.t !== 'string' || x.t.length < 16) return 'Falta el token';
  if (!x.s || !isShortcutStore(x.s)) return 'Tienda desconocida';
  if (!Array.isArray(x.pages) || x.pages.length === 0 || x.pages.length > MAX_PAGES) return 'Lista de páginas no válida';
  const host = new URL(SHORTCUT_STORES[x.s].start).hostname;
  if (typeof x.at !== 'string' || !x.at.includes(host)) return `El atajo no se ejecutó en ${host}`;
  for (const pg of x.pages) {
    if (typeof pg?.url !== 'string' || typeof pg.body !== 'string' || pg.body.length > MAX_BODY) return 'Página no válida';
    if (!pg.url.includes(host)) return 'Una página no es de la tienda';
  }
  return null;
}
