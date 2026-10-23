import type { ProductOffer, Unit } from './types.js';
import type { BrandPreference } from './profile.js';
import type { ListItem } from './basket.js';
import { unitPrice } from './normalize.js';

// Emparejador (SPEC §7): para un artículo de la lista, elige en una tienda el producto
// equivalente más barato por precio unitario, sin comprar de más.

/** Comprar como mucho el doble de lo necesario. */
export const MAX_OVERBUY = 2;

/**
 * Para productos que no caducan (legumbres, arroz, limpieza…), si no hay ningún formato
 * hasta el doble de lo necesario se acepta uno mayor, hasta este límite, avisando.
 */
export const PANTRY_MAX_OVERBUY = 6;

/** La palabra principal debe estar entre las N primeras del nombre del producto. */
export const MAIN_WORD_WINDOW = 3;

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'en', 'con', 'y', 'a', 'al', 'los', 'las', 'para', 'pack', 'l']);

export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/** Palabras significativas, con un plural sencillo quitado ("patatas" → "patata"). */
export function tokens(s: string): string[] {
  return normalizeText(s)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d/.test(w))
    .map(stem);
}

function stem(w: string): string {
  if (w.length > 4 && w.endsWith('es') && !w.endsWith('ces')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

/** Cuántas piezas trae una unidad de venta (para artículos que se cuentan en "ud"). */
function piecesOf(o: ProductOffer): number | null {
  if (o.pieces && o.pieces > 0) return o.pieces;
  if (o.size?.unit === 'ud') return o.size.qty;
  return null;
}

/** Cantidad que aporta una unidad de venta en la unidad del artículo. null = no comparable. */
export function contentIn(o: ProductOffer, unit: Unit): number | null {
  if (unit === 'ud') return piecesOf(o) ?? (o.size && o.size.unit !== 'ud' ? 1 : null);
  return o.size?.unit === unit ? o.size.qty : null;
}

export interface Candidate {
  offer: ProductOffer;
  /** Unidades de venta que hay que comprar. */
  units: number;
  /** Lo que se paga: price × units. */
  cost: number;
  /** €/kg, €/L o €/ud. */
  unitPrice: number;
  /** 0–1: parecido entre el artículo y el nombre del producto. */
  score: number;
}

export interface MatchResult {
  itemId: string;
  best: Candidate | null;
  /** Alternativas ordenadas (para que el usuario pueda cambiar el producto). */
  alternatives: Candidate[];
  confidence: 'high' | 'low' | 'none';
  reason?: string;
}

export interface MatchOptions {
  brand: BrandPreference;
  /** Producto elegido antes por el usuario para este artículo en esta tienda. */
  pinnedRef?: string;
}

function textScore(item: ListItem, offer: ProductOffer): number {
  const want = tokens(item.query);
  if (!want.length) return 0;
  // Solo el nombre y la marca: la categoría de la tienda es demasiado amplia
  // ("Lechuga y ensalada" contiene la rúcula; "Atún y conservas" las sardinas).
  const nameTokens = tokens(offer.name);
  const have = new Set([...nameTokens, ...tokens(offer.brand ?? '')]);
  // La palabra principal (leche, pan, atún…) tiene que estar al principio del nombre:
  // "Plátano de Canarias" sí, "Petit sabor fresa y plátano" no.
  const head = new Set(nameTokens.slice(0, MAIN_WORD_WINDOW));
  const main = item.mainWords?.length ? item.mainWords.flatMap(tokens) : [want[0]!];
  if (!main.some((w) => head.has(w))) return 0;
  const rest = want.slice(1);
  if (!rest.length) return 1;
  return 0.5 + (0.5 * rest.filter((w) => have.has(w)).length) / rest.length;
}

function avoided(item: ListItem, offer: ProductOffer): boolean {
  const name = normalizeText(`${offer.name} ${offer.formatText ?? ''}`);
  return (item.avoid ?? []).some((w) => name.includes(normalizeText(w)));
}

/** Construye un candidato si el producto sirve para el artículo; null si no. */
export function toCandidate(item: ListItem, offer: ProductOffer, maxOverbuy = MAX_OVERBUY): Candidate | null {
  if (!offer.available || offer.price <= 0) return null;
  if (avoided(item, offer)) return null;
  if (item.brand && !normalizeText(`${offer.brand ?? ''} ${offer.name}`).includes(normalizeText(item.brand))) return null;
  const score = textScore(item, offer);
  if (score === 0) return null;
  const content = contentIn(offer, item.unit);
  if (!content || content <= 0) return null;
  const units = Math.max(1, Math.ceil(item.qty / content - 1e-9));
  // Formato razonable: no comprar más del doble de lo necesario.
  if (units * content > item.qty * maxOverbuy + 1e-9) return null;
  const cost = Math.round(offer.price * units * 100) / 100;
  const up =
    item.unit === 'ud' ? Math.round((offer.price / content) * 1000) / 1000 : unitPrice(offer.price, offer.size) ?? Infinity;
  return { offer, units, cost, unitPrice: up, score };
}

/** Elige el mejor producto de una tienda para un artículo. */
export function matchItem(item: ListItem, offers: ProductOffer[], opts: MatchOptions): MatchResult {
  let candidates = offers.map((o) => toCandidate(item, o)).filter((c): c is Candidate => c !== null);
  let bigFormat = false;
  if (!candidates.length && !item.perishable) {
    candidates = offers.map((o) => toCandidate(item, o, PANTRY_MAX_OVERBUY)).filter((c): c is Candidate => c !== null);
    bigFormat = candidates.length > 0;
  }

  const pinned = opts.pinnedRef ? candidates.find((c) => c.offer.ref === opts.pinnedRef) : undefined;
  if (pinned) {
    return { itemId: item.id, best: pinned, alternatives: sortCandidates(candidates), confidence: 'high' };
  }
  if (!candidates.length) {
    return { itemId: item.id, best: null, alternatives: [], confidence: 'none', reason: 'Sin producto equivalente' };
  }

  // Preferencia de marca: si hay productos del tipo preferido, se elige entre ellos.
  if (opts.brand !== 'any' && !item.brand) {
    const wantStore = opts.brand === 'store';
    const preferred = candidates.filter((c) => c.offer.isStoreBrand === wantStore);
    if (preferred.length) candidates = preferred;
  }

  // Solo los que se parecen lo bastante al mejor parecido.
  const top = Math.max(...candidates.map((c) => c.score));
  const close = candidates.filter((c) => c.score >= top - 0.25);
  const sorted = sortCandidates(close);
  const best = sorted[0]!;
  return {
    itemId: item.id,
    best,
    alternatives: sortCandidates(candidates).slice(0, 8),
    confidence: best.score >= 0.75 ? 'high' : 'low',
    reason: bigFormat ? 'Formato grande: dura varias compras' : undefined,
  };
}

function sortCandidates(cs: Candidate[]): Candidate[] {
  return [...cs].sort((a, b) => a.unitPrice - b.unitPrice || a.cost - b.cost);
}
