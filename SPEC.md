# SPEC — Cesta Mallorca (versión simple)

Especificación vigente desde el 22/10/2026. El usuario usa **solo el iPhone**. No hay nada que instalar ni mantener encendido en el ordenador, porque el Mac va siempre con él.
El Prompt Maestro original queda como referencia de ideas para más adelante; donde choque con este documento, manda este documento. El estado real de cada tienda está en `docs/TIENDAS.md`, que manda sobre los dos.

## 1. Qué hace la app
Una PWA para el iPhone que:
1. A partir del perfil de la familia (personas, edades, dirección en Mallorca), **genera la lista de la compra**.
2. Busca cada producto en **Mercadona, Carrefour y Eroski** (principales) y en **Alcampo e Hiper Centro** (extra), con los precios reales para esa dirección.
3. Calcula el **total con el envío incluido** en cada tienda (y la mejor combinación de dos, si ahorra lo suficiente).
4. Devuelve la lista final de la tienda ganadora, **con un enlace a cada producto**. El usuario los añade al carrito y paga en la web o app de la tienda.

No hay login en las tiendas, no se rellena el carrito automáticamente y no hay que instalar nada en el ordenador.

## 2. Decisiones
| Tema | Decisión |
|---|---|
| Cliente | PWA para iPhone (Safari → "Añadir a pantalla de inicio"), en español, móvil primero. |
| Servidor | **Netlify** (<https://cesta-mallorca.netlify.app>). Next.js con funciones de servidor mediante `@netlify/plugin-nextjs`. Nada en el Mac. |
| Tiendas | Principales: **Mercadona, Carrefour y Eroski**. Extra: **Alcampo e Hiper Centro**. Fuera: Lidl (no vende comida online), Aldi y El Corte Inglés. |
| Carrefour y Eroski | Bloquean los servidores en la nube y no se esquiva esa protección. Hay dos vías, las dos con conexión real (no de centro de datos): **(1) Atajo del iPhone** (Fase 1): el usuario abre la tienda en Safari, pulsa Compartir → "Cesta: leer precios" y su iPhone consulta la lista con su conexión; las páginas en bruto se envían a la app, que las interpreta. **(2) Mini PC en casa** (fase posterior, opcional): un equipo siempre encendido conectado al router hace lo mismo de forma automática. |
| Datos del usuario | Perfil y listas se guardan **en el propio iPhone** (almacenamiento local de la PWA). Sin cuentas ni base de datos en esta versión. |
| Acceso | La app se protege con **una contraseña sencilla** (variable de entorno en Vercel) para que nadie más use la URL. |
| Emparejado | Heurística determinista; el usuario puede corregir un emparejado y la corrección se recuerda en el iPhone. Sin IA. |
| Datos | Ningún precio, envío ni cobertura sin fuente y fecha. Si falta: "sin dato". |

## 3. Tiendas (resumen; detalle en `docs/TIENDAS.md`)
| Tienda | Cómo se consulta | Envío | Mínimo | Cobertura |
|---|---|---|---|---|
| Mercadona | API pública de la web: el CP da el almacén y la búsqueda (Algolia pública) da precios por almacén | 8,20 € (oficial) | 60 € (oficial) | Por CP |
| Alcampo | Un navegador ligero en Vercel fija la región a partir de la dirección (una vez); luego los precios se leen del HTML de su búsqueda | 7,00 € día siguiente / 9,90 € mismo día (oficial) | Sin mínimo | Por dirección |
| Hiper Centro | Su web (población de entrega → catálogo) | 6,95 € (en vivo) | Sin mínimo | Por población |
| Carrefour | Atajo del iPhone: búsqueda de su web desde Safari | sin dato (se leerá de la web) | sin dato | se leerá de la web |
| Eroski | Atajo del iPhone: búsqueda de su web desde Safari | sin dato (se leerá de la web) | sin dato | se leerá de la web |

## 4. Pantallas
1. **Inicio / contraseña**: se pide la contraseña la primera vez y se recuerda en el iPhone.
2. **Perfil**:
   - Personas y rango de edad de cada una: 0–3, 4–11, 12–17, adulto, +65.
   - Dirección (calle, número, CP, población).
   - Marca blanca / de fabricante / indiferente.
   - Restricciones: sin gluten, sin lactosa, vegetariano, halal.
   - Mascotas.
   - Frecuencia: semanal o quincenal.
3. **Lista**:
   - Cesta base generada a partir del perfil, agrupada por categorías.
   - Cambiar cantidades, quitar productos, fijar una marca y añadir productos libres ("Cola Cao 760 g").
   - Guardar la lista y repetir la última.
4. **Comparar**:
   - Barra de progreso.
   - Por tienda: subtotal + envío = **total real**; aviso si no llega al mínimo ("te faltan X €").
   - Recomendación: mejor tienda única y, si compensa, mejor par.
   - Tabla por producto: precio, €/kg o €/L, oferta y el producto elegido en cada tienda (con opción de cambiarlo).
   - Avisos de no encontrados.
5. **Lista final**: productos de la tienda (o tiendas) recomendada, con cantidad, precio y **enlace a cada producto**. Botón "Copiar lista".

## 5. Arquitectura
```
apps/web            Next.js (App Router) + TS + Tailwind · PWA · rutas API que llaman a los conectores
packages/core       tipos, tiendas, normalizador, emparejador, optimizador, cesta base (puro, sin E/S)
packages/connectors un conector por tienda + shared/ + fixtures + tests
scripts/            verify-stores.ts (verificación en vivo, la ejecuta Claude)
docs/               TIENDAS.md · FRAGILIDAD.md · verificacion/*.json
```
- Contrato de conector (`packages/core/src/types.ts`), recortado a lo necesario: `checkCoverage(ctx)`, `getDeliveryTerms(ctx)` y `search(query)`. `ctx = { cp, address?, town? }`.
- Fuente de datos por prioridad:
  1. API pública que usa la propia web.
  2. HTML.
  3. Navegador ligero solo cuando la web lo exige (Alcampo, para fijar la región).
  4. **Nunca** saltarse protecciones.
- Ritmo humano: `Pacer` por tienda (una petición cada vez, pausas de 1,5–4 s, máx. 20 por minuto). Las tres tiendas se consultan en paralelo entre sí, pero cada una a ritmo humano.
- Una comparación se divide en lotes cortos de productos para no superar el tiempo máximo de las funciones de Vercel; la PWA va pidiendo lotes y muestra el progreso.
- Caché de precios en el servidor (en memoria o la caché de datos de Vercel) con `fetchedAt`. Un precio de más de 7 días se marca "desactualizado".

## 6. Cesta base y consumo
Factores por rango de edad:

| Rango | Factor |
|---|---|
| Adulto / 12–17 | 1,0 |
| +65 | 0,85 |
| 4–11 | 0,7 |
| 0–3 | 0,4 + categoría Bebé |

UC = suma de factores. Cantidad semanal = UC × cantidad base, redondeada al formato comercial. Si la compra es quincenal, ×2.

Cantidades base semanales por UC:
- Lácteos y huevos: leche 2,5 L · yogures 5 ud · huevos 6 ud · queso 150 g.
- Pan y desayuno: pan 1 kg · cereales/galletas 250 g.
- Despensa: pasta 300 g · arroz 300 g · legumbres 250 g · aceite de oliva 0,25 L · tomate triturado 400 g.
- Fruta y verdura: fruta 2 kg · verdura 2 kg · patatas 1 kg.
- Carne y pescado: pollo 400 g · carne roja/cerdo 300 g · pescado 350 g · embutido 100 g.
- Bebidas: agua 6 L · zumo 0,5 L.
- Limpieza e higiene: cantidades por hogar.

Categorías y genéricos (~80–100), activados según el perfil:
- Lácteos y huevos · panadería y desayuno · despensa · conservas y salsas · aceites y condimentos.
- Fruta y verdura · carne y pescado · congelados · bebidas (cerveza si hay adultos).
- Limpieza · higiene.
- Bebé (si hay alguien de 0–3) · mascotas (si las hay).

## 7. Cálculo
- `total = Σ(precio × unidades) + envío`.
- Si no llega al pedido mínimo, la tienda queda "no válida" con lo que falta.
- **Envío "sin dato"**: la tienda no puede salir recomendada sin un aviso destacado. Nunca se asume 0 €.
- No encontrados: se penalizan con el precio medio de las demás tiendas y se marcan.
- Emparejado: el producto equivalente más barato **por precio unitario**, con formato entre 0,5× y 2× de lo necesario y respetando la preferencia de marca.
- Pares: se evalúan todos los de las tiendas con datos.
  - Se recomienda un par solo si `ahorro > envío extra + 5 €` (umbral configurable).
  - Nunca más de 2 tiendas.
- Ofertas (fase posterior): 2x1, 3x2, 2ª unidad al X %, como sugerencia opcional con el ahorro en €.

## 8. Seguridad
Ver `CLAUDE.md`. En resumen:
- Sin CAPTCHAs ni protecciones esquivadas.
- Sin pagos.
- Secretos solo en variables de entorno.
- La dirección del usuario solo viaja en la petición de comparación y no se registra en logs.

## 9. Fases
| Fase | Alcance | ✅ Hecho cuando |
|---|---|---|
| **0** ✅ | Verificación de tiendas, `TIENDAS.md`, `SPEC.md`, `CLAUDE.md` | Hecho el 22/10/2026 |
| **1** | Lógica (`core`: cesta base, normalizador, emparejador, optimizador) + Mercadona + PWA (contraseña, perfil, lista, comparar, lista final) en Netlify + **atajo del iPhone para Carrefour y Eroski** | Desde el iPhone, una lista de 30 productos se compara en Mercadona, Carrefour y Eroski, con €/kg y total con envío |
| **2** | Extras: Alcampo e Hiper Centro. Opcional: mini PC en casa para Carrefour y Eroski en automático | La misma lista se compara en las 5 tiendas y la recomendación cuadra con las webs |
| **3** | Ofertas, historial de compras, ajustes de cantidades base | — |
| Más adelante (opcional) | Carrito automático, más tiendas, cuentas y base de datos, versión comercial | Se decide cuando la versión simple esté en uso |
