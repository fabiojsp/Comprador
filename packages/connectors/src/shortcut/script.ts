// Script que el usuario pega en la acción «Ejecutar JavaScript en la página web» del atajo.
// Es fijo: lee el plan del hash (#cesta=...), descarga las búsquedas en la propia
// página de la tienda (misma web, conexión y sesión del usuario, a ritmo humano)
// y devuelve un JSON con las respuestas recortadas. No inicia sesión, no compra,
// no toca CAPTCHAs: si la tienda muestra una comprobación, la pasa el usuario en Safari.

export const SHORTCUT_SCRIPT = String.raw`(async function () {
  var done = function (o) { completion(JSON.stringify(o)); };
  try {
    var h = location.hash, i = h.indexOf('cesta=');
    if (i < 0) { done({ error: 'Abre la tienda desde la app Cesta con el botón «Leer precios».' }); return; }
    var b = h.slice(i + 6).replace(/-/g, '+').replace(/_/g, '/');
    var plan = JSON.parse(decodeURIComponent(escape(atob(b))));
    var t0 = Date.now(), pages = [];
    var clean = function (txt, ct) {
      if (ct.indexOf('json') >= 0) return txt;
      return txt.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
    };
    var grab = async function (url, q, raw) {
      try {
        var r = await fetch(url, { credentials: 'include' });
        var ct = r.headers.get('content-type') || '';
        var body = await r.text();
        if (!raw) body = clean(body, ct);
        var cap = raw ? 300000 : 100000;
        pages.push({ q: q, url: url, status: r.status, ct: ct, body: body.slice(0, cap), cut: body.length > cap });
      } catch (e) {
        pages.push({ q: q, url: url, status: 0, ct: '', body: '', error: String(e) });
      }
    };
    var pause = function () { return new Promise(function (r) { setTimeout(r, 300 + Math.random() * 500); }); };
    for (var k = 0; k < plan.x.length; k++) { await grab(plan.x[k], null, true); await pause(); }
    for (var j = 0; j < plan.q.length; j++) {
      await grab(plan.tpl.replace('{q}', encodeURIComponent(plan.q[j])), plan.q[j], false);
      await pause();
    }
    done({ v: 1, t: plan.t, s: plan.s, at: location.href.split('#')[0], ua: navigator.userAgent, pages: pages, ms: Date.now() - t0 });
  } catch (e) {
    done({ error: 'Error del atajo: ' + String(e) });
  }
})();`;
