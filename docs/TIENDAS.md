# Tiendas — verificación (Fase 0)

Este documento **manda** sobre la tabla del Prompt Maestro. Fecha de la verificación: **22/10/2026**.
CP de prueba: **07009** (Palma), **07300** (Inca), **07360** (Lloseta, CP del perfil).

Cómo leerlo:
- **Verificación automática**: la genera `npm run verify-stores` en cada red donde se ejecuta. Hay un bloque por red.
- **Ficha por tienda**: lo verificado a mano, con fuente, fecha y tipo de fuente:
  - **en vivo**: leído de la web o la API de la tienda.
  - **oficial**: página de ayuda o condiciones de la tienda.
  - **snippet**: fragmento oficial visto solo en un buscador. *No se usa en la app.*
  - **secundaria**: prensa o webs de terceros. *No se usa en la app.*
- La app solo usa datos **en vivo** u **oficiales**. Todo lo demás queda como "sin dato".

## Resumen y decisiones

| Tienda | Tipo | Reparte 07009 / 07300 / 07360 | Envío | Pedido mín. | Gratis desde | En la app |
|---|---|---|---|---|---|---|
| Mercadona | online_alimentacion | ✅ / ✅ / ✅ (en vivo) | 8,20 € (oficial) | 60 € (oficial) | sin dato | **Sí** (Fase 1) |
| Alcampo | online_alimentacion | ✅ / ✅ / ✅ (en vivo) | 7,00 € tarifa Nacional (oficial) | sin mínimo (oficial) | sin dato | **Sí** (Fase 2) |
| Hiper Centro (TuHiper) | online_alimentacion | ✅ / ✅ / ✅ (en vivo) | 6,95 € (en vivo) | sin mínimo (en vivo) | sin dato | **Sí** (Fase 2) |
| Carrefour | online_alimentacion | ❔ sin dato (Cloudflare) | sin dato | sin dato | sin dato | No, de momento |
| Eroski | online_alimentacion | ❔ sin dato (reCAPTCHA) | sin dato | sin dato | sin dato | No, de momento |
| El Corte Inglés / Hipercor | online_alimentacion | ❔ sin dato (Akamai) | sin dato | sin dato | sin dato | No, de momento |
| Lidl | **solo_bazar** | 🛍️ sin compra básica online (en vivo) | — | — | — | No (folleto, más adelante) |
| Aldi | **sin_online** | — sin tienda online (en vivo) | — | — | — | No (folleto, más adelante) |

**Consecuencias para el plan (versión simple, ver `SPEC.md`)**

1. La app usa **Mercadona, Alcampo e Hiper Centro**: las tres reparten en los 3 CP de prueba y se pueden consultar desde la nube (Vercel).
2. **Carrefour, Eroski y El Corte Inglés** bloquean los servidores en la nube:
   - Carrefour devuelve un desafío de Cloudflare.
   - El Corte Inglés devuelve "Access Denied" de Akamai.
   - Eroski muestra una comprobación reCAPTCHA.

   Quedan fuera de momento. `verify-stores` seguirá comprobando si eso cambia.
3. **Alcampo**:
   - Resuelve la cobertura por **dirección geocodificada**, no solo por CP. El perfil guarda la dirección completa.
   - **Los precios dependen de la región**: con la región de Mallorca, una leche de la búsqueda sale a 9,54 € frente a 10,20 € en la región por defecto (Madrid).
   - Para fijar la región, su protección AWS WAF exige un token que genera un navegador real. Se usa un navegador ligero solo para ese paso; después los precios se leen del HTML de la búsqueda con peticiones normales.
4. **Hiper Centro** reparte por población, no por CP. Palma de 07000 a 07015 aparece como "Palma Ciudad y Alrededores".
5. **Lidl y Aldi** no entran en la cesta.

## Verificación automática

<!-- AUTO:nube-ip-de-centro-de-datos:START -->
### Red: Nube (IP de centro de datos)

_Generado por `npm run verify-stores` desde la red **Nube (IP de centro de datos)** el 22/10/2026, 7:34:38. No editar a mano este bloque._

| Tienda | 07009 | 07300 | 07360 | Envío base | Pedido mínimo | Fuente envío | Bloqueo detectado |
|---|---|---|---|---|---|---|---|
| Mercadona | ✅ reparte | ✅ reparte | ✅ reparte | 8,20 € | 60,00 € | official_doc | — |
| Carrefour | ❔ sin dato | ❔ sin dato | ❔ sin dato | sin dato | sin dato | none | cloudflare |
| Alcampo | ✅ reparte | ✅ reparte | ✅ reparte | 7,00 € | 0 € | official_doc | — |
| Eroski | ❔ sin dato | ❔ sin dato | ❔ sin dato | sin dato | sin dato | none | recaptcha |
| El Corte Inglés / Hipercor | ❔ sin dato | ❔ sin dato | ❔ sin dato | sin dato | sin dato | none | akamai |
| Hiper Centro (TuHiper) | ✅ reparte | ✅ reparte | ✅ reparte | 6,95 € | 0 € | live | — |
| Lidl | 🛍️ solo bazar | 🛍️ solo bazar | 🛍️ solo bazar | sin dato | sin dato | none | — |
| Aldi | — sin online | — sin online | — sin online | sin dato | sin dato | none | — |

<details><summary>Evidencias</summary>

- **Mercadona 07009** · delivers · API change-pc → 200, almacén 4744
- **Mercadona 07300** · delivers · API change-pc → 200, almacén 4781
- **Mercadona 07360** · delivers · API change-pc → 200, almacén 4519
- **Mercadona envío** · Fuentes: Coste de preparación (editado 2025-11-28); Pedido mínimo (editado 2026-02-10); Tramos disponibles y horarios de reparto (editado 2025-12-01). Coste igual para todos los CP con servicio según la FAQ. · https://ayuda.tienda.mercadona.es/hc/es/articles/360000857071-Coste-de-preparaci%C3%B3n
- **Carrefour 07009** · unknown · HTTP 403 "Un momento…" · _Cloudflare (desafío anti-bot) desde esta red._
- **Carrefour 07300** · unknown · HTTP 403 "Un momento…" · _Cloudflare (desafío anti-bot) desde esta red._
- **Carrefour 07360** · unknown · HTTP 403 "Un momento…" · _Cloudflare (desafío anti-bot) desde esta red._
- **Carrefour envío** · Tienda fuera del alcance actual.
- **Alcampo 07009** · delivers · deliverability=DELIVERABLE método=HOME_DELIVERY dirección="Carrer Gremi de Boneters, 52, Nord, 07009 Palma, Illes Balears, España"
- **Alcampo 07300** · delivers · deliverability=DELIVERABLE método=HOME_DELIVERY dirección="Gran Via Colom, 218, 07300 Inca, Illes Balears, España"
- **Alcampo 07360** · delivers · deliverability=DELIVERABLE método=HOME_DELIVERY dirección="Avinguda del Cocó, 2, 07360 Lloseta, Illes Balears, España"
- **Alcampo envío** · Tarifa "Nacional" de la página oficial. La web avisa de que el coste varía según franja y día: el importe real se confirma al elegir franja. · https://www.compraonline.alcampo.es/content/servicios-entrega-recogida
- **Eroski 07009** · unknown · HTTP 200 "Comprobando tu navegador - reCAPTCHA" · _Comprobación reCAPTCHA del navegador desde esta red._
- **Eroski 07300** · unknown · HTTP 200 "Comprobando tu navegador - reCAPTCHA" · _Comprobación reCAPTCHA del navegador desde esta red._
- **Eroski 07360** · unknown · HTTP 200 "Comprobando tu navegador - reCAPTCHA" · _Comprobación reCAPTCHA del navegador desde esta red._
- **Eroski envío** · Tienda fuera del alcance actual.
- **El Corte Inglés / Hipercor 07009** · unknown · HTTP 503 "Access Denied" · _Akamai ("Access Denied") desde esta red._
- **El Corte Inglés / Hipercor 07300** · unknown · HTTP 403 "Access Denied" · _Akamai ("Access Denied") desde esta red._
- **El Corte Inglés / Hipercor 07360** · unknown · HTTP 403 "Access Denied" · _Akamai ("Access Denied") desde esta red._
- **El Corte Inglés / Hipercor envío** · Tienda fuera del alcance actual.
- **Hiper Centro (TuHiper) 07009** · delivers · Población "Palma Ciudad y Alrededores (07000-07015)" (id 9000) en el selector de entrega de Mallorca
- **Hiper Centro (TuHiper) 07300** · delivers · Población "Inca" (id 9215) en el selector de entrega de Mallorca
- **Hiper Centro (TuHiper) 07360** · delivers · Población "Lloseta" (id 9280) en el selector de entrega de Mallorca
- **Hiper Centro (TuHiper) envío** · Pago a la entrega (efectivo o tarjeta). Acceso de cliente con móvil + clave de 4 dígitos. · https://tuhiper.com/A9/Login.aspx?p_IdCP=9280
- **Lidl 07009** · bazaar_only · Búsqueda "leche": 8 resultados y ninguno es leche (p. ej. "Espumador de leche »SMSP 500 A1«", "Espumador de leche", "Espumador de leche", "Cuña de queso viejo de oveja")
- **Lidl 07300** · bazaar_only · Búsqueda "leche": 8 resultados y ninguno es leche (p. ej. "Espumador de leche »SMSP 500 A1«", "Espumador de leche", "Espumador de leche", "Cuña de queso viejo de oveja")
- **Lidl 07360** · bazaar_only · Búsqueda "leche": 8 resultados y ninguno es leche (p. ej. "Espumador de leche »SMSP 500 A1«", "Espumador de leche", "Espumador de leche", "Cuña de queso viejo de oveja")
- **Lidl envío** · No aplica: sin alimentación online.
- **Aldi 07009** · no_online · La web no tiene carrito ni compra online (solo ofertas y folleto por región)
- **Aldi 07300** · no_online · La web no tiene carrito ni compra online (solo ofertas y folleto por región)
- **Aldi 07360** · no_online · La web no tiene carrito ni compra online (solo ofertas y folleto por región)
- **Aldi envío** · No aplica: sin compra online.

</details>
<!-- AUTO:nube-ip-de-centro-de-datos:END -->

<!-- AUTO:INSERT -->

## Ficha por tienda

### Mercadona — tienda.mercadona.es
- **Cobertura (en vivo)**:
  - La API pública `PUT /api/postal-codes/actions/change-pc/` responde 200 con la cabecera `x-customer-wh`:
    - 07009 → almacén 4744.
    - 07300 → almacén 4781.
    - 07360 → almacén 4519.
  - Controles negativos: 07870 y 99999 → 404 `"This zip code is outside of our working area"`.
  - **Los precios dependen del almacén** que corresponde al CP.
- **Envío (oficial)**: "El coste de preparación es de 8,20€". FAQ [360000857071](https://ayuda.tienda.mercadona.es/hc/es/articles/360000857071), editada el 28/11/2025. Se lee automáticamente de la API pública del centro de ayuda.
- **Pedido mínimo (oficial)**: "El pedido mínimo es de 60€". FAQ [360000841092](https://ayuda.tienda.mercadona.es/hc/es/articles/360000841092), editada el 10/02/2026. El JavaScript de la web aún contiene `MIN_PURCHASE:50`, pero prevalece la FAQ, que es más reciente.
- **Envío gratis**: sin dato. Ninguna FAQ lo menciona.
- **Franjas (oficial)**: de 7:00 a 22:00, de lunes a sábado, en tramos de 1 o 2 h, según la zona. FAQ [360000840672](https://ayuda.tienda.mercadona.es/hc/es/articles/360000840672).
- **Login para ver precios**: no hace falta. Comprobado en vivo: la búsqueda devuelve precios sin sesión.
- **Fuente de datos para el conector (en vivo)**: la búsqueda de la web usa el índice público de Algolia `products_prod_<almacén>_es`, con la clave de solo búsqueda que lleva la propia web. Devuelve:
  - `price_instructions.unit_price`
  - `bulk_price` y `reference_format` (€/L, €/kg)
  - `is_pack`, `unit_size` y `size_format`
  - las categorías
- **Anti-bot detectado**: Akamai Bot Manager (`sensor_data`) y reCAPTCHA en la web. La API de cobertura y la búsqueda responden desde la nube sin problema.
- **Fidelización**: sin programa.
- **Recogida en tienda**: sin dato.

### Carrefour — carrefour.es/supermercado
- **Desde la nube**: 403 con el desafío de Cloudflare ("Un momento… Verificación de seguridad en curso"). No se intenta resolver.
- **Snippets no verificados** (no se usan en la app):
  - "gratis por compras superiores a 140€… 3,99€" (página regional de Andalucía).
  - Franjas de 2–3 h de 10:00 a 22:00.
  - Click & Collect.
- **Fuera del alcance actual** (versión simple).
- **Fidelización (informativo)**: Club Carrefour, sin efecto verificado sobre el envío.

### Alcampo — compraonline.alcampo.es
- **Cobertura (en vivo)**: a través de su buscador de direcciones (Google Maps) y la API `ecomdeliverydestinations`:
  - Una dirección de 07009, de 07300 y de 07360 dan las tres `deliverability=DELIVERABLE` y `HOME_DELIVERY`, con la región de Mallorca `e5a30b4b-…`.
  - Se ofrece también **recogida**.
- **Envío (oficial, en vivo)**: página [Servicios de entrega y recogida](https://www.compraonline.alcampo.es/content/servicios-entrega-recogida), tarifa **Nacional**:
  - Domicilio al día siguiente o posterior: **7,00 €**.
  - Mismo día: **9,90 €**.
  - **"Haz tu pedido sin importe mínimo"**.
  - Recogida en parking o lockers: 3 €, gratis a partir de 50 €.
  - Las condiciones generales de venta dicen "Recogida… GRATUITO". Ante esa discrepancia, prevalece la página de servicios.
- **Aviso oficial**: "el coste… variará en función de la franja horaria y día seleccionado". El importe definitivo se confirma al elegir franja (Fase 2).
- **Envío gratis**: sin dato para la tarifa Nacional. Alcampo Más solo funciona en Madrid y Logroño.
- **Login para ver precios**: no hace falta.
- **Anti-bot detectado**: AWS WAF en modo silencioso. Navegando con normalidad no bloquea.
- **Fidelización (informativo)**: Club Alcampo, sin efecto en el envío.

### Eroski — supermercado.eroski.es
- **Desde la nube**: se queda en "Comprobando tu navegador – reCAPTCHA" más de 20 s. No se intenta resolver.
- **Oficial** ([página de envío](https://supermercado.eroski.es/es/supermercado/envio/), leída por el agente de investigación):
  - Coste según día y franja, "siendo el importe mínimo 3,95€".
  - "GRATIS si tu pedido supera los 140 €" pagando con tarjetas EROSKI.
  - Click&Drive gratis desde 30 €.
  - Click & Collect sin mínimo.
  - No se usa: tienda fuera del alcance actual.
- **Fidelización (informativo)**: EROSKI club. El envío gratis va ligado a pagar con tarjeta EROSKI.

### El Corte Inglés / Hipercor — elcorteingles.es/supermercado
- **Desde la nube**: "Access Denied" de Akamai (403). No se intenta esquivar.
- **Snippets no verificados**:
  - Palma figura en la lista de gastos de envío.
  - "Gratis para compras superiores a 130€ o 110€ con la Tarjeta de compra"; 8 € por debajo de ese importe en Palma.
  - Inca y Lloseta: sin dato.
- **Fuera del alcance actual** (versión simple).
- **Fidelización (informativo)**: Tarjeta El Corte Inglés y El Corte Inglés Plus. Pendiente de verificar.

### Hiper Centro — tuhiper.com (Hiper Manacor S.L.)
- **Cobertura (en vivo)**: selector "Elija lugar de entrega → Mallorca", con 110 poblaciones.
  - **Palma Ciudad y Alrededores (07000-07015)**: id 9000.
  - **Inca**: id 9215.
  - **Lloseta**: id 9280.
  - También figuran, entre otras: Binissalem, Marratxí, Consell, Sencelles, Santa Maria del Camí, Sineu, Petra, Montuïri, Sant Joan, Ariany, Costitx, Lloret de Vista Alegre, Maria de la Salut, Santa Eugènia, Alaró y Ruberts-Pina.
- **Envío (en vivo)**: "Gastos del Servicio Standard: 6,95€". Mismo importe en Palma, Inca y Lloseta.
- **Pedido mínimo (en vivo)**: "Sin importe mínimo de compra".
- **Plazo (en vivo)**: "en menos de 3 horas. A cualquier punto de la isla todos los días".
- **Pago**: a la entrega, en efectivo o con tarjeta. **No se paga online.**
- **Login**: no hace falta para ver precios ("Cliente Nuevo – Te registras al confirmar tu pedido"). El cliente registrado entra con **móvil + clave de 4 dígitos**.
- **Web**: ASP.NET WebForms (postbacks). La búsqueda del catálogo no se lanza con Enter; se investiga en el conector de la Fase 2.
- **Recogida**: hipercentro.com anuncia "la pots recollir a la botiga" (puedes recogerla en la tienda). Es oficial, pero no está verificado por población.

### Lidl — lidl.es
- **En vivo**: la búsqueda "leche" devuelve espumadores, cafeteras y algún artículo gourmet suelto (p. ej. una cuña de queso Roncero), pero **ninguna leche**.
- La ayuda oficial (snippet) dice que la tienda online es "exclusivamente de bazar". El banner muestra "Envío GRATIS desde 79€ con tu cuenta LIDL", pero eso es para bazar.
- **Decisión**: `solo_bazar`, desactivada para la cesta. Más adelante: ofertas del folleto como referencia (Fase 3).

### Aldi — aldi.es
- **En vivo**: la web no tiene carrito ni compra online. Tiene selector de región (Península / Canarias / Baleares) y ofertas.
- **Decisión**: `sin_online`, desactivada. Solo folleto de Baleares como referencia (Fase 3).
