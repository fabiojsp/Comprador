import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import type { CaptureSummary } from '@/lib/atajo';

export const runtime = 'nodejs';

/** Descarga la última captura en bruto de una tienda (para crear sus lectores con fixtures). Requiere sesión. */
export async function GET(req: Request) {
  const store = new URL(req.url).searchParams.get('store');
  if (store !== 'carrefour' && store !== 'eroski') return NextResponse.json({ error: 'Tienda no válida.' }, { status: 400 });
  const latest = await kv().get<CaptureSummary>(`latest/${store}`);
  if (!latest) return NextResponse.json({ error: 'Todavía no hay capturas de esta tienda.' }, { status: 404 });
  return NextResponse.json(await kv().get(`capture/${latest.token}`));
}
