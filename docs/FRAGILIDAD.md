# Fragilidad de conectores

Qué se rompe con más facilidad y cómo detectarlo. Se actualiza al cerrar cada fase.

**Detección general:** `npm run verify-stores` devuelve `unknown` con el motivo "Error del sondeo (posible cambio en la web)" cuando un paso del navegador falla. Si una tienda que antes salía ✅ pasa a ❔, revisar primero esta lista.

## Fase 0

| Tienda | Punto frágil | Síntoma | Cómo detectarlo / arreglarlo |
|---|---|---|---|
| Mercadona | `PUT /api/postal-codes/actions/change-pc/` y la cabecera `x-customer-wh` | Todos los CP salen `unknown` con HTTP ≠ 200/404 | Test `parseCoverageResponse`; abrir tienda.mercadona.es, introducir un CP y mirar la petición en DevTools |
| Mercadona | IDs de artículos del centro de ayuda (`HELP_ARTICLES`) y frases "El coste de preparación es de…" y "El pedido mínimo es de…" | Envío o mínimo pasan a `null` (`source: none`) | Fixtures `mercadona/help-*.json`; si cambian, buscar el artículo nuevo en ayuda.tienda.mercadona.es |
| Mercadona | Akamai Bot Manager | 403 en la API desde la nube | `blockedBy: 'akamai'`: la tienda pasa a "sin dato"; no hay alternativa sin esquivar la protección |
| Alcampo | Diálogo de dirección: botón con el CP en la cabecera, "Cambiar el método de entrega", placeholder "Busca tu dirección", "Confirmar ubicación" | Timeout en `locator.click` | El error aparece en la evidencia de `verify-stores`; actualizar los textos o roles en `stores/alcampo/probe.ts` |
| Alcampo | Geocodificación de Google: con solo el CP a veces no resuelve una dirección (pasó con 07300) | `unknown` "Dirección no geocodificada" | El sondeo prueba 3 variantes; en la app se usa la dirección completa del perfil |
| Alcampo | Texto de la tarifa "Nacional" en la página de servicios | `baseCost: null` | Fixture `alcampo/servicios-entrega-recogida.txt` |
| Hiper Centro | ASP.NET WebForms: botón "Mallorca", `select[name=LbCP]`, redirección a `Login.aspx` | Timeout o lista vacía | Fixture `hipercentro/poblaciones-mallorca.json` (110 poblaciones); comprobar que el `<select>` sigue llamándose `LbCP` |
| Hiper Centro | Texto "Gastos del Servicio Standard: X€" | `baseCost: null` | Fixture `hipercentro/login-lloseta.txt` |
| Lidl | `[data-qa-label="product-grid-box-title"]` en la búsqueda | `unknown` "No se pudieron leer los resultados" | Revisar el selector en lidl.es/q/search?q=leche |
| Aldi | Detección de carrito por texto | Falso `unknown` si aparece la palabra "carrito" | Revisión manual |
| Carrefour / Eroski / ECI | Bloqueo anti-bot desde servidores en la nube | `blockedBy` cloudflare / recaptcha / akamai | Esperado: tiendas fuera de alcance. **No esquivar.** |
| Todas | Detección de páginas de bloqueo (`shared/block-detect.ts`) por título o texto | Un bloqueo nuevo se interpreta como página normal | Fixtures `blocks/*.html`; añadir la nueva página de bloqueo como fixture cuando aparezca |

## Fase 1 — Atajo del iPhone (Carrefour, Eroski)

| Pieza | Punto frágil | Síntoma | Cómo detectarlo / arreglarlo |
|---|---|---|---|
| Plantillas de búsqueda (`packages/connectors/src/shortcut/plan.ts`) | URL de búsqueda de Carrefour (`search-api`) y Eroski (`/es/search/results/`) **sin confirmar** hasta la primera captura real | El atajo responde ✅ pero las páginas vienen con estado ≠ 200 o sin productos | `GET /api/atajo/raw?store=carrefour` (con sesión) descarga la última captura; ajustar la plantilla en el servidor (el script del atajo no cambia) |
| Script del atajo (`shortcut/script.ts`) | Depende de `completion()`, `atob`, `escape` y `fetch` en Safari | El atajo muestra "Error del atajo: …" | Test `shortcut.test.ts` (simulado) y prueba en Chromium real; si Apple cambia la acción, revisar la guía `/atajo` |
| Envío del atajo (una sola acción) | El script envía con `fetch` `no-cors` a `plan.api`; si la política CSP de la tienda lo bloquea, usa un formulario POST (campo `datos`) que abre Cesta en Safari. Si la CSP también bloquea `form-action`, no llega nada | La app no recibe la captura aunque el atajo diga ✅ | Mirar `/api/atajo/resultado`; si pasa, volver a la acción «Obtener contenido de URL» con el resultado del script |
| Envío del atajo | Tamaño: hasta ~4,5 MB (100 KB por búsqueda) | Netlify rechaza > 6 MB | Bajar el recorte en el script o partir el plan |
| Comprobación anti-bot en Safari | Carrefour (Cloudflare) / Eroski (reCAPTCHA) pueden mostrarla también al usuario | `blocked > 0` en el resumen | El usuario espera a que cargue la tienda y repite. **Nunca** se resuelve por él |
| Netlify Blobs (`apps/web/lib/kv.ts`) | Solo funciona dentro de Netlify; fuera usa memoria | Capturas que "desaparecen" en local | Esperado en local |
| Hiper Centro (investigado) | Búsqueda `tienda.aspx/BusquedaProdAgrup` devuelve ids de agrupaciones; los productos llegan por *postback* ASP.NET (`UpProds`) | — | Pendiente (Fase 2) |
| Alcampo (investigado) | `product-pages/search` sin navegador devuelve precios de la región por defecto (Madrid), no de Mallorca; fijar región exige token AWS WAF de navegador | — | Pendiente (Fase 2) |
