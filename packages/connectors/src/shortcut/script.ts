// Script que el usuario pega en la acción «Ejecutar JavaScript en la página web» del atajo.
// Es la ÚNICA acción del atajo. Es fijo: lee el plan del hash (#cesta=...), descarga las
// búsquedas en la propia página de la tienda (misma web, conexión y sesión del usuario,
// a ritmo humano) y envía el resultado a la app:
//   1) fetch POST "no-cors" a plan.api (si la política de la web lo permite),
//   2) si no, un formulario POST que abre la app en Safari con la confirmación.
// No inicia sesión, no compra, no toca CAPTCHAs: si la tienda muestra una comprobación,
// la pasa el usuario en Safari.

export const SHORTCUT_SCRIPT = String.raw`(async function () {
  var done = function (msg) { completion(msg); };
  try {
    var h = location.hash, i = h.indexOf('cesta=');
    if (i < 0) { done('❌ Abre la tienda desde la app Cesta con el botón «Leer precios».'); return; }
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
    var data = JSON.stringify({ v: 1, t: plan.t, s: plan.s, at: location.href.split('#')[0], ua: navigator.userAgent, pages: pages, ms: Date.now() - t0 });
    var n = pages.filter(function (p) { return p.q !== null && p.status === 200; }).length;
    try {
      await fetch(plan.api, { method: 'POST', mode: 'no-cors', headers: { 'content-type': 'text/plain' }, body: data });
      done('✅ ' + n + ' búsquedas enviadas a Cesta. Vuelve a la app.');
    } catch (e) {
      var f = document.createElement('form');
      f.method = 'POST'; f.action = plan.api; f.style.display = 'none';
      var ta = document.createElement('textarea'); ta.name = 'datos'; ta.value = data;
      f.appendChild(ta); document.body.appendChild(f);
      done('✅ ' + n + ' búsquedas listas. Se abrirá Cesta para recibirlas.');
      setTimeout(function () { f.submit(); }, 300);
    }
  } catch (e) {
    done('❌ Error del atajo: ' + String(e));
  }
})();`;
