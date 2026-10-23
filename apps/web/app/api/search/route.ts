import { NextResponse } from 'next/server';
import { isValidCp, type ProductOffer } from '@cesta/core';
import { searchMercadona, warehouseFor } from '@cesta/connectors/mercadona';
import { cached, HOUR } from '@/lib/cache';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_QUERIES = 6;

/**
 * Busca un lote de artículos en una tienda. El emparejado y el total se calculan en el iPhone
 * (packages/core es puro), así el servidor solo trae precios.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { store?: string; cp?: string; queries?: string[] };
  const { store, cp } = body;
  const queries = [...new Set((body.queries ?? []).map((q) => String(q).trim()).filter(Boolean))];
  if (store !== 'mercadona') return NextResponse.json({ error: 'Tienda no disponible todavía.' }, { status: 400 });
  if (!cp || !isValidCp(cp)) return NextResponse.json({ error: 'Código postal no válido.' }, { status: 400 });
  if (!queries.length || queries.length > MAX_QUERIES) {
    return NextResponse.json({ error: `Envía entre 1 y ${MAX_QUERIES} búsquedas por petición.` }, { status: 400 });
  }

  const warehouse = await cached(`wh:${cp}`, 12 * HOUR, () => warehouseFor(cp));
  if (!warehouse) return NextResponse.json({ error: 'Mercadona no reparte en este código postal o no responde.' }, { status: 409 });

  const results: Record<string, ProductOffer[] | { error: string }> = {};
  for (const q of queries) {
    try {
      results[q] = await cached(`mc:${warehouse}:${q.toLowerCase()}`, 6 * HOUR, () => searchMercadona(warehouse, q));
    } catch (err) {
      // Sin datos personales en el log: solo la tienda y el error.
      console.error('mercadona search', String(err).slice(0, 200));
      results[q] = { error: 'No se pudo consultar Mercadona ahora mismo.' };
    }
  }
  return NextResponse.json({ store, warehouse, results });
}
