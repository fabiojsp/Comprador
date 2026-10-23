import type { DeliveryTerms, StoreId } from './types.js';
import type { Candidate } from './match.js';

// Optimizador (SPEC §7): total real por tienda (con envío) y mejor par de tiendas.

export const DEFAULT_PAIR_THRESHOLD = 5;

/** Para cada tienda: mejor candidato por artículo (o null si no lo tiene). */
export type StoreMatches = Record<string, Candidate | null>;

export interface StoreInput {
  storeId: StoreId;
  matches: StoreMatches;
  terms: Pick<DeliveryTerms, 'baseCost' | 'minOrder' | 'freeFrom'>;
}

export interface Shipping {
  /** null = sin dato (nunca se asume 0). */
  cost: number | null;
  free: boolean;
}

export interface StoreTotal {
  storeId: StoreId;
  subtotal: number;
  /** Penalización por artículos no encontrados (precio medio en las demás tiendas). */
  penalty: number;
  missing: string[];
  shipping: Shipping;
  /** subtotal + envío. null si el envío es "sin dato". */
  total: number | null;
  /** total + penalización: para comparar tiendas en igualdad. */
  comparable: number | null;
  /** Falta para el pedido mínimo (0 si se cumple; null si el mínimo es "sin dato"). */
  belowMinimumBy: number | null;
  valid: boolean;
}

export interface PairTotal {
  stores: [StoreId, StoreId];
  /** Artículo → tienda donde se compra. */
  assignment: Record<string, StoreId>;
  parts: StoreTotal[];
  total: number | null;
  comparable: number | null;
  valid: boolean;
}

export interface Recommendation {
  single: StoreTotal | null;
  pair: PairTotal | null;
  /** Ahorro del par frente a la mejor tienda única. */
  pairSaving: number | null;
  singles: StoreTotal[];
  warnings: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function shippingFor(terms: StoreInput['terms'], subtotal: number): Shipping {
  if (terms.freeFrom !== null && subtotal >= terms.freeFrom) return { cost: 0, free: true };
  return { cost: terms.baseCost, free: false };
}

/** Precio medio de un artículo en las tiendas que lo tienen (para penalizar a las que no). */
export function averageCosts(stores: StoreInput[], itemIds: string[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const id of itemIds) {
    const costs = stores.map((s) => s.matches[id]?.cost).filter((c): c is number => typeof c === 'number');
    out[id] = costs.length ? r2(costs.reduce((a, b) => a + b, 0) / costs.length) : null;
  }
  return out;
}

export function storeTotal(
  store: StoreInput,
  itemIds: string[],
  avg: Record<string, number | null>,
): StoreTotal {
  let subtotal = 0;
  let penalty = 0;
  const missing: string[] = [];
  for (const id of itemIds) {
    const c = store.matches[id];
    if (c) subtotal += c.cost;
    else {
      missing.push(id);
      penalty += avg[id] ?? 0;
    }
  }
  subtotal = r2(subtotal);
  penalty = r2(penalty);
  const shipping = shippingFor(store.terms, subtotal);
  const total = shipping.cost === null ? null : r2(subtotal + shipping.cost);
  const min = store.terms.minOrder;
  const belowMinimumBy = min === null ? null : r2(Math.max(0, min - subtotal));
  return {
    storeId: store.storeId,
    subtotal,
    penalty,
    missing,
    shipping,
    total,
    comparable: total === null ? null : r2(total + penalty),
    belowMinimumBy,
    valid: total !== null && belowMinimumBy === 0 && subtotal > 0,
  };
}

/** Reparte los artículos entre dos tiendas (cada uno donde sale más barato). */
export function pairTotal(a: StoreInput, b: StoreInput, itemIds: string[], avg: Record<string, number | null>): PairTotal {
  const assignment: Record<string, StoreId> = {};
  const ma: StoreMatches = {};
  const mb: StoreMatches = {};
  for (const id of itemIds) {
    const ca = a.matches[id];
    const cb = b.matches[id];
    if (ca && (!cb || ca.cost <= cb.cost)) {
      assignment[id] = a.storeId;
      ma[id] = ca;
    } else if (cb) {
      assignment[id] = b.storeId;
      mb[id] = cb;
    }
  }
  const idsA = itemIds.filter((id) => assignment[id] === a.storeId);
  const idsB = itemIds.filter((id) => assignment[id] === b.storeId);
  const missing = itemIds.filter((id) => !assignment[id]);
  const partA = storeTotal({ ...a, matches: ma }, idsA, avg);
  const partB = storeTotal({ ...b, matches: mb }, idsB, avg);
  const penalty = r2(missing.reduce((s, id) => s + (avg[id] ?? 0), 0));
  const total = partA.total === null || partB.total === null ? null : r2(partA.total + partB.total);
  return {
    stores: [a.storeId, b.storeId],
    assignment,
    parts: [partA, { ...partB, missing }],
    total,
    comparable: total === null ? null : r2(total + penalty),
    valid: partA.valid && partB.valid && idsA.length > 0 && idsB.length > 0,
  };
}

/**
 * Mejor tienda única y mejor par (solo si ahorra más que `threshold`).
 * El envío extra del par ya está incluido en su total.
 */
export function recommend(stores: StoreInput[], itemIds: string[], threshold = DEFAULT_PAIR_THRESHOLD): Recommendation {
  const avg = averageCosts(stores, itemIds);
  const singles = stores.map((s) => storeTotal(s, itemIds, avg));
  const warnings: string[] = [];

  const ranked = singles
    .filter((s) => s.valid && s.comparable !== null)
    .sort((x, y) => x.comparable! - y.comparable!);
  const single = ranked[0] ?? null;

  for (const s of singles) {
    if (s.shipping.cost === null) warnings.push(`${s.storeId}: envío sin dato, no puede salir recomendada`);
    else if (s.belowMinimumBy && s.belowMinimumBy > 0) warnings.push(`${s.storeId}: faltan ${s.belowMinimumBy.toFixed(2)} € para el pedido mínimo`);
  }

  let pair: PairTotal | null = null;
  for (let i = 0; i < stores.length; i++) {
    for (let j = i + 1; j < stores.length; j++) {
      const p = pairTotal(stores[i]!, stores[j]!, itemIds, avg);
      if (!p.valid || p.comparable === null) continue;
      if (!pair || p.comparable < pair.comparable!) pair = p;
    }
  }
  const pairSaving = pair && single ? r2(single.comparable! - pair.comparable!) : null;
  if (!pair || !single || pairSaving === null || pairSaving <= threshold) {
    return { single, pair: null, pairSaving, singles, warnings };
  }
  return { single, pair, pairSaving, singles, warnings };
}
