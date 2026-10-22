# SPEC — Cesta Mallorca

Especificación final del proyecto. Parte del *Prompt Maestro* e incorpora las decisiones tomadas con el usuario (22/10/2026) y lo verificado en la Fase 0 (`docs/TIENDAS.md`).

**En caso de conflicto, el orden de prioridad es:**
1. `docs/TIENDAS.md` (lo verificado).
2. Este documento.
3. El Prompt Maestro.

## 1. Objetivo
Web app que, a partir del perfil de una familia en Mallorca:
1. Genera su lista de la compra.
2. Consulta los supermercados online que reparten en su dirección.
3. Compara precios reales y recomienda **la compra más barata con el envío incluido**.
4. Rellena el carrito en la tienda elegida. El usuario solo revisa y paga en la web o app de la tienda.

El valor diferencial es: **cesta familiar + cobertura real en Mallorca + coste total con envío + carrito listo**.

## 2. Decisiones de producto y arquitectura
| Tema | Decisión |
|---|---|
| Cliente | **PWA para iPhone** (Safari → "Añadir a pantalla de inicio"), móvil primero, en español. Sin App Store. |
| Servidor | **En la nube desde la Fase 1**: Railway (servicio web + servicio worker con Chromium + Postgres). |
| Tiendas que bloquean la nube | El worker está desacoplado: pide trabajos a la API por HTTPS (`WORKER_TOKEN`) y puede ejecutarse en la nube **o en el Mac de casa** (IP doméstica). Cada tienda tiene `affinity: cloud \| home` (`packages/core/src/stores.ts`). Si el worker de casa está apagado, la tienda aparece "no disponible ahora". |
| BD | **Postgres desde el inicio** con Prisma (sin paso por SQLite). Todas las tablas con `userId`. |
| Login de la app | Email + contraseña (argon2), cookie de sesión httpOnly. El enlace mágico queda para la Fase 4. |
| Login en tiendas | **Navegador remoto dentro de la PWA** (Fase 2): el worker abre la página de login con Playwright, emite la pantalla por CDP `Page.startScreencast` sobre WebSocket y reenvía toques y teclado. El usuario escribe sus credenciales y resuelve CAPTCHA/2FA. Se guarda el `storageState` cifrado (AES-256-GCM). |
| Bóveda de credenciales | Opcional y **desactivada por defecto** (`VAULT_ENABLED`). AES-256-GCM con clave derivada (scrypt) de una contraseña maestra; la clave solo vive en la memoria del worker. Se desactiva antes de comercializar. |
| Emparejado | Heurística determinista + confirmación del usuario. Sin IA. |
| CP de prueba | 07009, 07300 y **07360 (Lloseta, CP del perfil)**. |
| Mac del usuario | macOS. Ejecuta `verify-stores` y el worker de casa. |

## 3. Tiendas
El estado real está en `docs/TIENDAS.md`. Resumen a 22/10/2026:
- **Activas para la cesta**: Mercadona, Carrefour, Alcampo, Eroski, El Corte Inglés/Hipercor e Hiper Centro.
  - Carrefour, Eroski y ECI tienen `affinity: home`.
- **Referencia (folleto)**: Lidl (`solo_bazar`) y Aldi (`sin_online`).

Registro en BD por tienda: `nombre, url, activa, tipo (online_alimentacion | solo_bazar | sin_online), requiere_login, affinity, notas`.

Particularidades verificadas que el modelo debe soportar:
- **Mercadona**: precios por almacén (el CP determina el almacén).
- **Alcampo**: cobertura por dirección geocodificada; hace falta la dirección completa.
- **Hiper Centro**: cobertura por población, no por CP; pago a la entrega; login con móvil + PIN.

## 4. Pantallas
- **P1 Login de la app**: email + contraseña. Preparado para multiusuario.
- **P2 Perfil familiar** (obligatorio antes de comprar):
  - Personas, con el rango de edad de cada una: 0–3, 4–11, 12–17, adulto, +65.
  - **Dirección completa** (calle, número, CP, población).
  - Marca blanca / de fabricante / indiferente.
  - Restricciones: sin gluten, sin lactosa, vegetariano, halal…
  - Mascotas.
  - Frecuencia: semanal o quincenal.
  - Presupuesto orientativo (opcional).
  - Franja preferida: mañana, tarde o sábado.
  - Con todo esto se calcula el perfil de consumo (§6).
- **P3 Tiendas**:
  - Estado de cada tienda para la dirección: ✅ reparte · ⚠️ solo recogida · ❌ no reparte · 🛍️ solo bazar · ❔ sin dato (con fecha y motivo).
  - Selección de en qué tiendas buscar.
  - "Conectar cuenta" (navegador remoto) y estado de la sesión: conectada, caducada o sin cuenta.
  - Indicador de si el worker de casa está en línea.
- **P4 Lista de la compra**:
  - Cesta base generada automáticamente, agrupada por categorías.
  - Editar cantidades, quitar productos, fijar una marca concreta y añadir productos libres con buscador.
  - Guardar listas y repetir la última compra.
- **P5 Comparativa y recomendación**:
  - Tabla producto × tienda: precio, €/kg o €/L, oferta, disponibilidad y antigüedad del precio.
  - Totales por tienda: subtotal + envío − descuentos.
  - Tres recomendaciones: mejor tienda única, mejor par y ofertas que merecen la pena.
  - Avisos: no encontrados, sustituciones, mínimo no alcanzado ("te faltan X €"), datos "sin dato" o desactualizados.
- **P6 Carrito**:
  - "Enviar al carrito de [tienda]" con la sesión del usuario.
  - Informe: añadidos ✅, sin stock ❌, sustituidos 🔁.
  - Termina con el enlace para abrir el carrito en la web o app de la tienda. **El pago y la confirmación los hace siempre el usuario.**
- **P7 Historial**: compras, gasto por tienda y por mes, y ahorro estimado frente a la opción más cara.

## 5. Arquitectura
```
apps/web            Next.js (App Router) + TS + Tailwind · PWA (manifest, iconos, safe areas de iOS)
apps/worker         Node + Playwright · consume la cola vía HTTPS · navegador remoto (WS)
packages/core       tipos, tiendas, normalizador, emparejador, optimizador, cesta base (puro, sin E/S)
packages/connectors un conector por tienda + shared/ (navegador, bloqueos, ritmo, http) + fixtures + tests
packages/db         Prisma (Postgres) · schema · seed
scripts/            verify-stores.ts
docs/               TIENDAS.md · FRAGILIDAD.md · verificacion/*.json · CHECKLIST_COMERCIAL.md (Fase 4)
```

### Contrato de conector (`packages/core/src/types.ts`)
```ts
interface StoreConnector {
  id: StoreId;
  checkCoverage(ctx: DeliveryContext): Promise<Coverage>;        // DeliveryContext = { cp, address?, town? }
  getDeliveryTerms(ctx: DeliveryContext): Promise<DeliveryTerms>;
  sessionStatus(): Promise<'ok' | 'expired' | 'none'>;
  openAssistedLogin(): Promise<void>;                            // navegador remoto
  search(query: string, opts?): Promise<ProductOffer[]>;
  getProduct(ref: string): Promise<ProductOffer>;
  addToCart(items: CartItem[]): Promise<CartReport>;
}
```
- Cambio respecto al Prompt Maestro: recibe `DeliveryContext` en lugar de solo `cp`, porque Alcampo necesita la dirección e Hiper Centro la población.
- Todo `Coverage` y `DeliveryTerms` lleva `source` (`live` | `official_doc` | `none`), `checkedAt` y evidencia. Si hay bloqueo, `blockedBy`.
- Fuente de datos por prioridad:
  1. API JSON pública que usa la propia web (Mercadona: `change-pc` y búsqueda Algolia pública; Alcampo: `/api/...`).
  2. HTML renderizado.
  3. **Nunca** saltarse protecciones.
- Caché de precios con `fetched_at`. Un precio de más de 7 días se marca "desactualizado".
- Ritmo humano: `Pacer` por tienda (una petición cada vez, pausas de 1,5–4 s, `STORE_MAX_REQ_PER_MIN`), reintentos con backoff ante errores 5xx o de red.

### Cola y workers
- Tabla `Job` (tipo, tienda, payload, estado, intentos, `lockedBy`, `lockedUntil`, resultado).
- Los workers llaman a `POST /api/worker/claim` con su `affinity` y devuelven el resultado por `POST /api/worker/complete`.
- La web enseña el progreso de una comparación con sondeo corto o SSE.

### Recolección de precios
- **Bajo demanda** al pulsar "Comparar": solo los artículos de la lista, en las tiendas elegidas.
- **Programada** (Fase 3): refresco semanal de la cesta base.

## 6. Cesta base y perfil de consumo
Factores por rango de edad (editables):

| Rango | Factor |
|---|---|
| Adulto / 12–17 | 1,0 |
| +65 | 0,85 |
| 4–11 | 0,7 |
| 0–3 | 0,4 + categoría Bebé |

**Unidades de consumo (UC)** = suma de factores. Cantidad semanal = UC × cantidad base, redondeada al formato comercial más cercano. En compra quincenal se multiplica por 2.

Cantidades base semanales por UC (editables):
- Lácteos y huevos: leche 2,5 L · yogures 5 ud · huevos 6 ud · queso 150 g.
- Pan y desayuno: pan 1 kg · cereales/galletas 250 g.
- Despensa: pasta 300 g · arroz 300 g · legumbres 250 g · aceite de oliva 0,25 L · tomate triturado 400 g.
- Fruta y verdura: fruta 2 kg · verdura y hortalizas 2 kg · patatas 1 kg.
- Carne y pescado: pollo 400 g · carne roja/cerdo 300 g · pescado 350 g · embutido 100 g.
- Bebidas: agua 6 L · zumo 0,5 L.
- Limpieza e higiene: cantidades por hogar (no por UC), con reposición quincenal o mensual.

Categorías y genéricos de la cesta base (~90): los de la §6 del Prompt Maestro. El Asesor los activa según el perfil:
- Bebé, si hay alguien de 0–3.
- Mascotas, si las hay.
- Cerveza, si hay adultos.
- Restricciones: sin gluten, sin lactosa, vegetariano, halal.

## 7. Optimización, ofertas y fidelización
- `total = Σ(precio_elegido × unidades) + envío(subtotal, dirección, franja) − descuentos_aplicables`.
- Si el subtotal no llega al pedido mínimo, la tienda queda "no válida" con el importe que falta.
- **Envío "sin dato"**: la tienda se muestra, pero no puede ganar una recomendación sin un aviso destacado. Nunca se asume 0 €.
- Productos no encontrados: se penalizan con el precio medio de las demás tiendas y se marcan.
- Combinaciones: se evalúan por fuerza bruta todas las tiendas individuales y todos los pares.
  - Un par solo se recomienda si `ahorro_vs_mejor_individual > envío_extra + umbral` (umbral de 5 € por defecto).
  - Nunca más de 2 tiendas.
- Ofertas: 2x1, 3x2, 2ª unidad al X %, descuento directo y precio rebajado, calculando su precio unitario efectivo.
  - Solo se proponen si la cantidad obligada es ≤ 2× la necesidad y el producto no es perecedero (o se consume en el periodo).
  - Son sugerencias opcionales con el ahorro en €; nunca se añaden sin aceptación.
- Fidelización:
  - **Fase 1–3**: avisos informativos (Club Carrefour, EROSKI club / tarjeta EROSKI, Tarjeta ECI, Club Alcampo).
  - **Fase 4**: reglas modelables (envío gratis desde X €) si el usuario declara sus tarjetas.

## 8. Login y registro en tiendas
- **Modo por defecto: navegador remoto + sesión persistente cifrada.**
  - Cuando la sesión caduca, la app avisa: "Sesión de X caducada — reconectar".
  - Fase 3: aviso por Web Push en la PWA instalada (iOS 16.4+).
- **Bóveda opcional**: ver §2.
- **Registro asistido**: el navegador remoto abre el registro y la app rellena los campos con los datos del perfil. El usuario revisa, acepta las condiciones, resuelve el CAPTCHA y pulsa "Crear cuenta".
- **Límites fijos**:
  - No se resuelven ni automatizan CAPTCHAs ni sistemas anti-bot.
  - No se completan pagos.
  - No se aceptan condiciones por el usuario.

## 9. Seguridad
Ver la sección "Reglas de seguridad" de `CLAUDE.md`. Antes de la Fase 4, `docs/CHECKLIST_COMERCIAL.md` debe cubrir:
- RGPD.
- Condiciones de uso de cada tienda respecto a la automatización.
- Política de privacidad.
- Valoración de acuerdos, afiliación o APIs oficiales.

## 10. Modelo de datos (mínimo)
- `User`
- `FamilyProfile` (con dirección, CP y población) y `FamilyMember`.
- `Store` (con `affinity`), `StoreCoverage(userId, storeId, cp, address_hash, status, source, checkedAt, evidence)` y `DeliveryTerms`.
- `StoreSession(encryptedState)`.
- `Product` (genérico), `StoreProduct(precio, precio_unitario, oferta, fetched_at, warehouse/region)` y `ProductMatch(confirmado_por_usuario)`.
- `ShoppingList` y `ShoppingListItem`.
- `Comparison` y `ComparisonResult`.
- `Order` (historial) y `Job`.

## 11. Fases y criterios de aceptación
| Fase | Alcance | ✅ Hecho cuando |
|---|---|---|
| **0** | Andamiaje, `verify-stores`, `docs/TIENDAS.md`, `CLAUDE.md`, `SPEC.md` | Cada tienda tiene estado y condiciones de envío verificadas, o "sin dato" justificado, para 07009, 07300 y 07360. Queda pendiente la pasada desde el Mac para Carrefour, Eroski y ECI. |
| **1** | `core` completo (normalizador, emparejador, optimizador, cesta base), Prisma + seed, P1, P2, P4 y P5, conectores de Mercadona (nube) y Carrefour (casa), cola y workers, Dockerfiles, despliegue en Railway | Una lista de 30 productos se compara en menos de 3 min desde el iPhone, con €/kg y total con envío. |
| **2** | Conectores de Alcampo, Eroski, ECI e Hiper Centro; P3 completa; navegador remoto; registro asistido; bóveda opcional; P6 `addToCart` | El carrito de la tienda recomendada queda relleno y el informe cuadra con la web. |
| **3** | Ofertas, fidelización informativa, P7, refresco programado, Web Push, folletos de Lidl y Aldi | — |
| **4** | Multiusuario real, enlace mágico, checklist comercial, desactivar la bóveda | — |

## 12. Entregables
- `README.md`: instalación paso a paso, no técnica, para macOS y Railway.
- `SPEC.md`, `CLAUDE.md` y `docs/TIENDAS.md`.
- Comandos: `npm run dev`, `npm run worker`, `npm run worker:home`, `npm test`, `npm run seed` y `npm run verify-stores`.
- Fixtures por tienda (`packages/connectors/fixtures/`), para que los tests no dependan de internet.
- Al cerrar cada fase, `docs/FRAGILIDAD.md`: qué se rompe con más facilidad y cómo detectarlo.
