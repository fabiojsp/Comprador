import { describe, expect, it } from 'vitest';
import { buildPlan, planUrl, SHORTCUT_SCRIPT, validatePayload, type CapturePayload } from '../src/shortcut/index.js';

/** Ejecuta el script del atajo como lo haría Atajos en Safari, con una tienda simulada. */
async function runScript(
  href: string,
  responses: Record<string, { status?: number; ct: string; body: string }>,
  opts: { blockPost?: boolean } = {},
) {
  const fetched: string[] = [];
  const posted: { url: string; body: string; mode?: string }[] = [];
  const forms: { action: string; datos: string }[] = [];
  const document = {
    body: { appendChild: () => undefined },
    createElement: (tag: string) => {
      const el: Record<string, unknown> = { style: {}, children: [] as unknown[] };
      el.appendChild = (c: unknown) => (el.children as unknown[]).push(c);
      el.submit = () => forms.push({ action: el.action as string, datos: ((el.children as { value: string }[])[0]!).value });
      return tag === 'form' ? el : { name: '', value: '' };
    },
  };
  const result = await new Promise<string>((resolve) => {
    const fn = new Function('location', 'fetch', 'navigator', 'completion', 'atob', 'escape', 'setTimeout', 'document', SHORTCUT_SCRIPT);
    fn(
      { href, hash: href.slice(href.indexOf('#')) },
      async (url: string, init?: { method?: string; body?: string; mode?: string }) => {
        if (init?.method === 'POST') {
          if (opts.blockPost) throw new TypeError('Refused to connect (CSP)');
          posted.push({ url, body: init.body!, mode: init.mode });
          return { status: 0, headers: { get: () => '' }, text: async () => '' };
        }
        fetched.push(url);
        const r = responses[url] ?? { status: 404, ct: 'text/html', body: 'no' };
        return { status: r.status ?? 200, headers: { get: () => r.ct }, text: async () => r.body };
      },
      { userAgent: 'iPhone test' },
      resolve,
      (s: string) => Buffer.from(s, 'base64').toString('binary'),
      (s: string) => s.replace(/[^\x00-\x7f]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')),
      (f: () => void) => f(),
      document,
    );
  });
  const sent = posted[0]?.body ?? forms[0]?.datos;
  return { message: result, payload: sent ? (JSON.parse(sent) as CapturePayload) : null, fetched, posted, forms };
}

describe('atajo del iPhone', () => {
  const API = 'https://cesta-mallorca.netlify.app/api/atajo';
  const plan = buildPlan('carrefour', 'tok_0123456789abcdef', ['leche semidesnatada', 'plátano', 'leche semidesnatada'], API);
  const url = planUrl(plan);

  it('el plan viaja en el hash y quita búsquedas repetidas', () => {
    expect(url.startsWith('https://www.carrefour.es/supermercado#cesta=')).toBe(true);
    expect(plan.q).toEqual(['leche semidesnatada', 'plátano']);
  });

  const responses = () => {
    const search = (q: string) => plan.tpl.replace('{q}', encodeURIComponent(q));
    return {
      [search('leche semidesnatada')]: { ct: 'application/json', body: '{"docs":[1]}' },
      [search('plátano')]: { ct: 'text/html', body: '<div>Plátano</div><script>var x=1</script>   <style>a{}</style>' },
      'https://www.carrefour.es/supermercado': { ct: 'text/html', body: '<html><script>cfg</script></html>' },
    };
  };

  it('descarga extras y búsquedas, limpia el HTML y lo envía solo a la app (una única acción)', async () => {
    const { message, payload, fetched, posted } = await runScript(url, responses());
    expect(fetched).toHaveLength(3);
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ url: API, mode: 'no-cors' });
    expect(message).toMatch(/✅ 2 búsquedas enviadas/);
    expect(payload).toMatchObject({ v: 1, t: plan.t, s: 'carrefour', at: 'https://www.carrefour.es/supermercado' });
    const banana = payload!.pages.find((p) => p.q === 'plátano')!;
    expect(banana.body).toBe('<div>Plátano</div> ');
    expect(payload!.pages.find((p) => p.q === null)!.body).toContain('<script>cfg</script>'); // extras sin recortar
    expect(validatePayload(payload)).toBeNull();
  });

  it('si la web bloquea el envío directo, usa un formulario hacia la app', async () => {
    const { message, payload, forms } = await runScript(url, responses(), { blockPost: true });
    expect(forms).toHaveLength(1);
    expect(forms[0]!.action).toBe(API);
    expect(message).toMatch(/Se abrirá Cesta/);
    expect(validatePayload(payload)).toBeNull();
  });

  it('sin plan en el hash avisa en vez de fallar', async () => {
    const { message, posted } = await runScript('https://www.carrefour.es/supermercado', {});
    expect(message).toMatch(/Leer precios/);
    expect(posted).toHaveLength(0);
  });

  it('rechaza envíos de otra web o manipulados', () => {
    const base: CapturePayload = { v: 1, t: plan.t, s: 'carrefour', at: 'https://www.carrefour.es/', ua: '', ms: 1, pages: [{ q: 'a', url: 'https://www.carrefour.es/x', status: 200, ct: 'json', body: '{}' }] };
    expect(validatePayload(base)).toBeNull();
    expect(validatePayload({ ...base, at: 'https://evil.example/' })).toMatch(/no se ejecutó/);
    expect(validatePayload({ ...base, pages: [{ ...base.pages[0]!, url: 'https://evil.example/x' }] })).toMatch(/no es de la tienda/);
    expect(validatePayload({ ...base, s: 'mercadona' as never })).toMatch(/Tienda desconocida/);
    expect(validatePayload({ ...base, t: 'corto' })).toMatch(/token/);
  });
});
