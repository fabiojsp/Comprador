import { validatePayload, type CapturePayload } from '@cesta/connectors/shortcut';
import { detectBlock } from '@cesta/connectors/block';
import { kv } from '@/lib/kv';
import { PLAN_TTL_MS, type CaptureSummary, type StoredPlan } from '@/lib/atajo';

export const runtime = 'nodejs';
export const maxDuration = 30;

const NAMES = { carrefour: 'Carrefour', eroski: 'Eroski' } as const;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// El script del atajo envía en texto plano (fetch). Si la web de la tienda no lo deja,
// envía un formulario y Safari abre esta respuesta: entonces se devuelve una página.
function reply(msg: string, status: number, asPage: boolean): Response {
  if (!asPage) return new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cesta</title></head>
<body style="margin:0;font-family:-apple-system,system-ui,sans-serif;background:#f6f1e7;color:#1d1b17">
<main style="max-width:28rem;margin:0 auto;padding:3rem 1.25rem;text-align:center">
<p style="font-size:1.25rem;line-height:1.5">${escapeHtml(msg)}</p>
<a href="/" style="display:block;margin-top:2rem;padding:1rem;border-radius:1rem;background:#b5532f;color:#fff;font-weight:600;text-decoration:none">Volver a Cesta</a>
</main></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

/** Recibe la captura del atajo. Público, pero solo acepta tokens de planes recientes. */
export async function POST(req: Request) {
  const asPage = (req.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded');
  const text = (msg: string, status = 200) => reply(msg, status, asPage);

  let raw = await req.text();
  if (asPage) raw = new URLSearchParams(raw).get('datos') ?? '';
  let payload: (CapturePayload & { error?: string }) | null = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return text('❌ El atajo no envió datos válidos. Vuelve a copiar el código desde la guía del atajo en Cesta.', 400);
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
