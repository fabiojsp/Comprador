import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import type { CaptureSummary } from '@/lib/atajo';

export const runtime = 'nodejs';

/** Estado de una captura (la PWA lo consulta mientras el usuario ejecuta el atajo). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('t');
  if (!token) return NextResponse.json({ error: 'Falta el token.' }, { status: 400 });
  const summary = await kv().get<CaptureSummary>(`summary/${token}`);
  // Los precios de Carrefour/Eroski se interpretarán aquí cuando existan sus lectores (con fixtures reales).
  return NextResponse.json({ received: !!summary, summary, offers: null });
}
