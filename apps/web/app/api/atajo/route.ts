import { validatePayload, type CapturePayload } from '@cesta/connectors/shortcut';
import { detectBlock } from '@cesta/connectors/block';
import { kv } from '@/lib/kv';
import { PLAN_TTL_MS, type CaptureSummary, type StoredPlan } from '@/lib/atajo';

export const runtime = 'nodejs';
export const maxDuration = 30;

const NAMES = { carrefour: 'Carrefour', eroski: 'Eroski' } as const;

// El atajo muestra esta respuesta como texto en el iPhone: mensajes cortos y claros.
const text = (msg: string, status = 200) => new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

/** Recibe la captura del atajo. Público, pero solo acepta tokens de planes recientes. */
export async function POST(req: Request) {
  const raw = await req.text();
  let payload: (CapturePayload & { error?: string }) | null = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return text('❌ El atajo no envió datos válidos. Revisa el paso 3 de la guía: el cuerpo debe ser el «Resultado de JavaScript».', 400);
  }
  if (payload?.error) return text(`❌ ${payload.error}`, 400);
  const invalid = validatePayload(payload);
  if (invalid || !payload) return text(`❌ ${invalid}`, 400);

  const store = kv();
  const plan = await store.get<StoredPlan>(`plan/${payload.t}`);
  if (!plan || plan.store !== payload.s) return text('❌ Este enlace ya no vale. Vuelve a la app y pulsa «Leer precios» otra vez.', 403);
  if (Date.now() - Date.parse(plan.createdAt) > PLAN_TTL_MS) return text('❌ El enlace ha caducado (2 h). Pulsa «Leer precios» otra vez.', 403);
  if (await store.get(`capture/${payload.t}`)) return text('ℹ️ Estos precios ya se habían recibido. Vuelve a la app Cesta.');

  const blocked = payload.pages.filter((p) => detectBlock({ status: p.status, title: (p.body.match(/<title>([^<]*)/i)?.[1] ?? ''), body: p.body }) !== null).length;
  const ok = payload.pages.filter((p) => p.status === 200 && p.q !== null).length;
  const summary: CaptureSummary = {
    token: payload.t,
    store: payload.s,
    receivedAt: new Date().toISOString(),
    pages: payload.pages.length,
    ok,
    blocked,
    ms: payload.ms,
  };
  await store.set(`capture/${payload.t}`, payload);
  await store.set(`summary/${payload.t}`, summary);
  await store.set(`latest/${payload.s}`, summary);

  const name = NAMES[payload.s];
  if (blocked > 0 && ok === 0) return text(`⚠️ ${name} mostró una comprobación de seguridad. Ábrela en Safari, espera a que cargue la tienda y vuelve a ejecutar el atajo.`);
  return text(`✅ ${name}: ${ok} búsquedas recibidas. Vuelve a la app Cesta.`);
}
