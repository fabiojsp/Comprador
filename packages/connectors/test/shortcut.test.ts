import { describe, expect, it } from 'vitest';
import { buildPlan, planUrl, SHORTCUT_SCRIPT, validatePayload, type CapturePayload } from '../src/shortcut/index.js';

/** Ejecuta el script del atajo como lo haría Atajos en Safari, con una tienda simulada. */
async function runScript(href: string, responses: Record<string, { status?: number; ct: string; body: string }>) {
  const fetched: string[] = [];
  const result = await new Promise<string>((resolve) => {
    const fn = new Function('location', 'fetch', 'navigator', 'completion', 'atob', 'escape', 'setTimeout', SHORTCUT_SCRIPT);
    fn(
      { href, hash: href.slice(href.indexOf('#')) },
      async (url: string) => {
        fetched.push(url);
        const r = responses[url] ?? { status: 404, ct: 'text/html', body: 'no' };
        return { status: r.status ?? 200, headers: { get: () => r.ct }, text: async () => r.body };
      },
      { userAgent: 'iPhone test' },
      resolve,
      (s: string) => Buffer.from(s, 'base64').toString('binary'),
      (s: string) => s.replace(/[^\x00-\x7f]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')),
      (f: () => void) => f(),
    );
  });
  return { payload: JSON.parse(result) as CapturePayload & { error?: string }, fetched };
}

describe('atajo del iPhone', () => {
  const plan = buildPlan('carrefour', 'tok_0123456789abcdef', ['leche semidesnatada', 'plátano', 'leche semidesnatada']);
  const url = planUrl(plan);

  it('el plan viaja en el hash y quita búsquedas repetidas', () => {
    expect(url.startsWith('https://www.carrefour.es/supermercado#cesta=')).toBe(true);
    expect(plan.q).toEqual(['leche semidesnatada', 'plátano']);
  });

  it('el script descarga extras y búsquedas, limpia el HTML y devuelve un envío válido', async () => {
    const search = (q: string) => plan.tpl.replace('{q}', encodeURIComponent(q));
    const { payload, fetched } = await runScript(url, {
      [search('leche semidesnatada')]: { ct: 'application/json', body: '{"docs":[1]}' },
      [search('plátano')]: { ct: 'text/html', body: '<div>Plátano</div><script>var x=1</script>   <style>a{}</style>' },
      'https://www.carrefour.es/supermercado': { ct: 'text/html', body: '<html><script>cfg</script></html>' },
    });
    expect(fetched).toHaveLength(3);
    expect(payload.error).toBeUndefined();
    expect(payload).toMatchObject({ v: 1, t: plan.t, s: 'carrefour', at: 'https://www.carrefour.es/supermercado' });
    const banana = payload.pages.find((p) => p.q === 'plátano')!;
    expect(banana.body).toBe('<div>Plátano</div> ');
    expect(payload.pages.find((p) => p.q === null)!.body).toContain('<script>cfg</script>'); // extras sin recortar
    expect(validatePayload(payload)).toBeNull();
  });

  it('sin plan en el hash avisa en vez de fallar', async () => {
    const { payload } = await runScript('https://www.carrefour.es/supermercado', {});
    expect(payload.error).toMatch(/Leer precios/);
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
