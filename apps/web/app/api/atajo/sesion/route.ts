import { NextResponse } from 'next/server';
import { buildPlan, isShortcutStore, planUrl } from '@cesta/connectors/shortcut';
import { kv } from '@/lib/kv';
import { newToken, type StoredPlan } from '@/lib/atajo';

export const runtime = 'nodejs';

/** Crea un plan para el atajo y devuelve la URL de la tienda a abrir en Safari. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { store?: string; queries?: string[] };
  if (!body.store || !isShortcutStore(body.store)) return NextResponse.json({ error: 'Tienda no válida para el atajo.' }, { status: 400 });
  const queries = [...new Set((body.queries ?? []).map((q) => String(q).trim()).filter(Boolean))].slice(0, 80);
  if (!queries.length) return NextResponse.json({ error: 'La lista está vacía.' }, { status: 400 });
  const token = newToken();
  const plan: StoredPlan = { token, store: body.store, queries, createdAt: new Date().toISOString() };
  await kv().set(`plan/${token}`, plan);
  return NextResponse.json({ token, url: planUrl(buildPlan(body.store, token, queries)) });
}
