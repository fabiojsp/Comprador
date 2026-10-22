# Tiendas — verificación (Fase 0)

Este documento **manda** sobre la tabla del Prompt Maestro. Fecha de la verificación: **22/10/2026**.
CP de prueba: **07009** (Palma), **07300** (Inca), **07360** (Lloseta, CP del perfil).

Cómo leerlo:
- **Verificación automática**: la genera `npm run verify-stores` en cada red donde se ejecuta. Hay un bloque por red (nube, Mac de casa…).
- **Ficha por tienda**: lo verificado a mano, con fuente, fecha y tipo de fuente:
  - **en vivo**: leído de la web o la API de la tienda.
  - **oficial**: página de ayuda o condiciones de la tienda.
  - **snippet**: fragmento oficial visto solo en un buscador. *No se usa en la app.*
  - **secundaria**: prensa o webs de terceros. *No se usa en la app.*
- La app solo usa datos **en vivo** u **oficiales**. Todo lo demás queda como "sin dato".

## Resumen y decisiones

| Tienda | Tipo | Reparte 07009 / 07300 / 07360 | Envío | Pedido mín. | Gratis desde | Worker | Activa |
|---|---|---|---|---|---|---|---|
| Mercadona | online_alimentacion | ✅ / ✅ / ✅ (en vivo) | 8,20 € (oficial) | 60 € (oficial) | sin dato | nube | Sí (Fase 1) |
| Carrefour | online_alimentacion | ❔ sin dato (Cloudflare) | sin dato | sin dato | sin dato | **casa** | Sí (Fase 1) |
| Alcampo | online_alimentacion | ✅ / ✅ / ✅ (en vivo) | 7,00 € tarifa Nacional (oficial) | sin mínimo (oficial) | sin dato | nube | Sí (Fase 2) |
| Eroski | online_alimentacion | ❔ sin dato (reCAPTCHA) | sin dato | sin dato | sin dato | **casa** | Sí (Fase 2) |
| El Corte Inglés / Hipercor | online_alimentacion | ❔ sin dato (Akamai) | sin dato | sin dato | sin dato | **casa** | Sí (Fase 2) |
| Hiper Centro (TuHiper) | online_alimentacion | ✅ / ✅ / ✅ (en vivo) | 6,95 € (en vivo) | sin mínimo (en vivo) | sin dato | nube | Sí (Fase 2) |
| Lidl | **solo_bazar** | 🛍️ sin compra básica online (en vivo) | — | — | — | — | No (folleto) |
| Aldi | **sin_online** | — sin tienda online (en vivo) | — | — | — | — | No (folleto) |

**Consecuencias para el plan**

1. **Carrefour (Fase 1), Eroski y El Corte Inglés** no se pueden leer desde una IP de centro de datos:
   - Carrefour devuelve un desafío de Cloudflare (403).
   - El Corte Inglés devuelve "Access Denied" de Akamai.
   - Eroski muestra una comprobación reCAPTCHA.

   Sus conectores se ejecutan en el **worker de casa (Mac)**. Hay que repetir esta verificación desde el Mac: `npm run verify-stores -- --label "Mac casa"`.
2. **Alcampo resuelve la cobertura por dirección geocodificada**, no solo por CP. El perfil debe guardar la dirección completa.
3. **Hiper Centro reparte por población**, no por CP. El perfil guarda la población y el conector la busca en su lista. Palma de 07000 a 07015 aparece como "Palma Ciudad y Alrededores".
4. **Lidl y Aldi** quedan desactivadas para la cesta. Solo sirven como referencia de folleto (Fase 3).

## Verificación automática

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
- **Pendiente**: ejecutar `verify-stores` desde el Mac. El conector de la Fase 1 implementará la cobertura por CP y las condiciones de envío leídas de la web.
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
  - No se usa aún: hay que confirmar la cobertura en Mallorca y el coste concreto desde el Mac.
- **Fidelización (informativo)**: EROSKI club. El envío gratis va ligado a pagar con tarjeta EROSKI.

### El Corte Inglés / Hipercor — elcorteingles.es/supermercado
- **Desde la nube**: "Access Denied" de Akamai (403). No se intenta esquivar.
- **Snippets no verificados**:
  - Palma figura en la lista de gastos de envío.
  - "Gratis para compras superiores a 130€ o 110€ con la Tarjeta de compra"; 8 € por debajo de ese importe en Palma.
  - Inca y Lloseta: sin dato.
- **Pendiente**: verificación desde el Mac.
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
- **Pago**: a la entrega, en efectivo o con tarjeta. **No se paga online.** Al llegar a la Fase 2 habrá que decidir qué significa "carrito listo" en esta tienda.
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
