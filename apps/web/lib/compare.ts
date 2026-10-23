import {
  matchItem,
  recommend,
  type FamilyProfile,
  type ListItem,
  type MatchResult,
  type ProductOffer,
  type Recommendation,
  type StoreId,
} from '@cesta/core';
import type { StoreStatus } from './stores';

export type Pins = Partial<Record<StoreId, Record<string, string>>>;

export interface CompareResult {
  at: string;
  cp: string;
  stores: StoreStatus[];
  /** Ofertas recibidas por tienda y búsqueda (para poder cambiar de producto sin volver a buscar). */
  offers: Partial<Record<StoreId, Record<string, ProductOffer[]>>>;
  matches: Partial<Record<StoreId, Record<string, MatchResult>>>;
  recommendation: Recommendation;
  itemIds: string[];
  errors: string[];
}

export interface Progress {
  store: string;
  done: number;
  total: number;
}

const BATCH = 6;

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Sesión caducada');
  }
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json;
}

export async function fetchStores(cp: string): Promise<StoreStatus[]> {
  return (await post<{ stores: StoreStatus[] }>('/api/stores', { cp })).stores;
}

/** Recalcula emparejados y recomendación con lo ya descargado (al fijar un producto, por ejemplo). */
export function computeResult(
  base: Pick<CompareResult, 'at' | 'cp' | 'stores' | 'offers' | 'errors'>,
  items: ListItem[],
  profile: FamilyProfile,
  pins: Pins,
): CompareResult {
  const matches: CompareResult['matches'] = {};
  const inputs = [];
  for (const s of base.stores) {
    const offers = base.offers[s.storeId];
    if (!offers || !s.terms) continue;
    const m: Record<string, MatchResult> = {};
    for (const it of items) {
      m[it.id] = matchItem(it, offers[it.query] ?? [], { brand: profile.brand, pinnedRef: pins[s.storeId]?.[it.id] });
    }
    matches[s.storeId] = m;
    inputs.push({
      storeId: s.storeId,
      terms: s.terms,
      matches: Object.fromEntries(Object.entries(m).map(([id, r]) => [id, r.best])),
    });
  }
  const itemIds = items.map((i) => i.id);
  return { ...base, matches, itemIds, recommendation: recommend(inputs, itemIds) };
}

export async function runCompare(
  profile: FamilyProfile,
  items: ListItem[],
  pins: Pins,
  onProgress: (p: Progress) => void,
): Promise<CompareResult> {
  const cp = profile.address.cp;
  const stores = await fetchStores(cp);
  const offers: CompareResult['offers'] = {};
  const errors: string[] = [];
  const queries = [...new Set(items.map((i) => i.query))];

  for (const s of stores) {
    if (s.access !== 'cloud' || s.coverage?.status !== 'delivers') continue;
    const got: Record<string, ProductOffer[]> = {};
    onProgress({ store: s.name, done: 0, total: queries.length });
    for (let i = 0; i < queries.length; i += BATCH) {
      const batch = queries.slice(i, i + BATCH);
      try {
        const r = await post<{ results: Record<string, ProductOffer[] | { error: string }> }>('/api/search', { store: s.storeId, cp, queries: batch });
        for (const [q, v] of Object.entries(r.results)) {
          if (Array.isArray(v)) got[q] = v;
          else errors.push(`${s.name}: «${q}» — ${v.error}`);
        }
      } catch (err) {
        errors.push(`${s.name}: ${(err as Error).message}`);
      }
      onProgress({ store: s.name, done: Math.min(i + BATCH, queries.length), total: queries.length });
    }
    offers[s.storeId] = got;
  }
  return computeResult({ at: new Date().toISOString(), cp, stores, offers, errors }, items, profile, pins);
}
