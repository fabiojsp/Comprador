import type { ProductOffer, Unit } from '@cesta/core';
import { httpRequest } from '../../shared/http.js';
import { Pacer, DEFAULT_PACE } from '../../shared/pace.js';
import { mercadonaProbe } from './probe.js';

// Búsqueda de Mercadona: el índice público de Algolia que usa la propia web
// (clave de solo búsqueda incluida en tienda.mercadona.es). Precios por almacén.
// Si la clave cambia: abrir tienda.mercadona.es, buscar algo y copiar app id / api key
// de la petición a *.algolia.net (ver docs/FRAGILIDAD.md).
export const ALGOLIA = {
  appId: '7UZJKL1DJ0',
  apiKey: '9d8f2e39e90df472b4f2e559a116fe17',
  index: (warehouse: string) => `products_prod_${warehouse}_es`,
};

const STORE_BRANDS = new Set(['hacendado', 'deliplus', 'bosque verde', 'compy']);

interface PriceInstructions {
  unit_price: string;
  bulk_price: string | null;
  reference_format: string | null;
  unit_size: number | null;
  size_format: string | null;
  total_units: number | null;
  is_pack: boolean;
  previous_unit_price: string | null;
  price_decreased: boolean;
  approx_size: boolean;
}

export interface MercadonaHit {
  id: string;
  display_name: string;
  brand: string | null;
  packaging: string | null;
  published: boolean | null;
  share_url: string | null;
  thumbnail: string | null;
  categories: { name: string; categories?: { name: string; categories?: { name: string }[] }[] }[] | null;
  price_instructions: PriceInstructions;
  unavailable_from: string | null;
}

const UNIT_MAP: Record<string, Unit> = { kg: 'kg', l: 'l', ud: 'ud' };

function categoryPath(h: MercadonaHit): string[] {
  const out: string[] = [];
  let level = h.categories?.[0] as { name: string; categories?: unknown[] } | undefined;
  while (level) {
    out.push(level.name);
    level = (level.categories?.[0] as typeof level) ?? undefined;
  }
  return out;
}

/** Convierte un resultado de Algolia en ProductOffer. Puro, testeado con fixtures. */
export function parseHit(h: MercadonaHit, fetchedAt: string): ProductOffer | null {
  const p = h.price_instructions;
  const price = Number(p?.unit_price);
  if (!p || !Number.isFinite(price) || price <= 0) return null;
  const unit = p.size_format ? UNIT_MAP[p.size_format.toLowerCase()] : undefined;
  const prev = p.previous_unit_price ? Number(p.previous_unit_price.trim()) : NaN;
  const bulk = p.bulk_price ? Number(p.bulk_price) : NaN;
  const refUnit = p.reference_format ? UNIT_MAP[p.reference_format.toLowerCase()] ?? null : null;
  let size = unit && p.unit_size && p.unit_size > 0 ? { qty: p.unit_size, unit } : null;
  // Sin tamaño pero con precio de referencia oficial (€/kg, €/L): tamaño = precio / referencia.
  if (!size && refUnit && Number.isFinite(bulk) && bulk > 0) {
    size = { qty: Math.round((price / bulk) * 1000) / 1000, unit: refUnit };
  }
  return {
    storeId: 'mercadona',
    ref: h.id,
    name: h.display_name,
    brand: h.brand ?? null,
    isStoreBrand: h.brand ? STORE_BRANDS.has(h.brand.toLowerCase()) : null,
    formatText: [h.packaging, size ? `${size.qty} ${size.unit}` : null, p.approx_size ? '(peso aprox.)' : null]
      .filter(Boolean)
      .join(' · ') || null,
    size,
    pieces: p.total_units && p.total_units > 0 ? p.total_units : null,
    price,
    storeUnitPrice: Number.isFinite(bulk) && refUnit ? bulk : null,
    storeUnit: refUnit,
    promo:
      p.price_decreased && Number.isFinite(prev) && prev > price
        ? { kind: 'reduced_price', label: `Antes ${prev.toFixed(2).replace('.', ',')} €`, params: { previous: prev } }
        : null,
    available: h.published !== false && !h.unavailable_from,
    category: categoryPath(h),
    url: h.share_url,
    imageUrl: h.thumbnail,
    fetchedAt,
  };
}

const pacer = new Pacer(DEFAULT_PACE);
const warehouseByCp = new Map<string, string>();

/** Almacén de Mercadona para un CP (cacheado). null si no reparte o sin dato. */
export async function warehouseFor(cp: string): Promise<string | null> {
  const cached = warehouseByCp.get(cp);
  if (cached) return cached;
  const cov = await mercadonaProbe.checkCoverage({ cp }, { browser: () => Promise.reject(new Error('no browser')), now: () => new Date() });
  const wh = cov.status === 'delivers' ? cov.storeRef?.warehouse ?? null : null;
  if (wh) warehouseByCp.set(cp, wh);
  return wh;
}

export async function searchMercadona(warehouse: string, query: string, limit = 24): Promise<ProductOffer[]> {
  return pacer.run(async () => {
    const res = await httpRequest(
      `https://${ALGOLIA.appId.toLowerCase()}-dsn.algolia.net/1/indexes/${ALGOLIA.index(warehouse)}/query`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-algolia-api-key': ALGOLIA.apiKey,
          'x-algolia-application-id': ALGOLIA.appId,
          origin: 'https://tienda.mercadona.es',
          referer: 'https://tienda.mercadona.es/',
        },
        body: JSON.stringify({ query, hitsPerPage: limit }),
      },
    );
    if (res.status !== 200) throw new Error(`Mercadona búsqueda HTTP ${res.status}`);
    const fetchedAt = new Date().toISOString();
    const hits = (JSON.parse(res.text) as { hits: MercadonaHit[] }).hits;
    return hits.map((h) => parseHit(h, fetchedAt)).filter((o): o is ProductOffer => o !== null);
  });
}
