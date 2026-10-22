# CLAUDE.md — Cesta Mallorca

PWA (iPhone) que compara la compra online de supermercado en Mallorca **con el envío incluido** y deja el carrito listo en la tienda. La especificación completa está en `SPEC.md` y el estado real de cada tienda en `docs/TIENDAS.md` (que manda sobre cualquier suposición).

## Stack
- Monorepo con npm workspaces, TypeScript estricto, Node 22.
- `apps/web`: Next.js (App Router) + Tailwind, PWA móvil primero. *(Fase 1)*
- `apps/worker`: Node + Playwright (Chromium). Consume la cola por HTTPS; se ejecuta en la nube **o** en el Mac de casa. *(Fase 1)*
- `packages/core`: lógica pura y tipos (normalizador, emparejador, optimizador, cesta base). Sin E/S.
- `packages/connectors`: un conector por tienda (`src/stores/<id>/`) + utilidades compartidas (`src/shared/`) + `fixtures/` + `test/`.
- `packages/db`: Prisma + Postgres. *(Fase 1)*
- Despliegue: Railway (web + worker + Postgres). Tiendas con `affinity: 'home'` se ejecutan en el worker del Mac.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm test` | Vitest: lógica y conectores contra fixtures (sin internet) |
| `npm run typecheck` | `tsc --noEmit` de todo el repo |
| `npm run verify-stores -- [--cp 07360] [--store mercadona] [--label "Mac casa"]` | Verificación en vivo de cobertura y envío; regenera el bloque de esa red en `docs/TIENDAS.md` |
| `npm run dev` / `npm run worker` / `npm run worker:home` / `npm run seed` | *(Fase 1)* |

En el contenedor de Claude, para que `fetch` use el proxy: `NODE_USE_ENV_PROXY=1`. En el Mac no hace falta.

## Convenciones
- Código e identificadores en inglés; textos de interfaz, documentación y commits en español.
- Ningún precio, coste de envío o cobertura sin `source` (`live` | `official_doc`) y fecha. Si no hay dato: `null` / `'unknown'` y se muestra "sin dato" con la fecha del último intento. **Nunca inventar ni deducir.**
- Las funciones de parseo de cada tienda son puras y se exportan para testearlas con fixtures reales guardadas en `packages/connectors/fixtures/<tienda>/`.
- Fuente de datos por orden: (1) API JSON pública que usa la propia web, (2) HTML renderizado con Playwright. Nunca (3) saltarse protecciones.
- Ritmo humano: todas las peticiones a una tienda pasan por un `Pacer` (`shared/pace.ts`): una cada vez, pausas aleatorias de 1,5–4 s, máx. `STORE_MAX_REQ_PER_MIN` (20 por defecto).
- Precio con más de 7 días = "desactualizado".
- Todas las tablas llevan `userId` (multiusuario desde el inicio).
- Al cerrar cada fase: tests en verde, `typecheck` limpio, commit, resumen y actualizar `docs/FRAGILIDAD.md`.

## Reglas de seguridad (no negociables)
1. **No** resolver, automatizar ni esquivar CAPTCHAs, desafíos anti-bot (Cloudflare, Akamai, reCAPTCHA, AWS WAF) ni proxies residenciales para evadirlos. Si una web bloquea: `blockedBy` + "sin dato", o se ejecuta en el worker de casa con ritmo humano.
2. **No** completar pagos, **no** aceptar condiciones legales, **no** pulsar "Crear cuenta" por el usuario. El flujo termina con el carrito listo.
3. Secretos solo en `.env` (no versionado); documentados en `.env.example`.
4. Sesiones de tienda (`storageState`) cifradas con AES-256-GCM (`SESSION_ENC_KEY`). No se guardan contraseñas salvo en la bóveda opcional (desactivada por defecto, `VAULT_ENABLED`), cifrada con clave derivada (scrypt) de una contraseña maestra; se desactiva antes de comercializar.
5. Nunca registrar en logs ni devolver por la API: contraseñas, cookies, tokens, `storageState`, direcciones, teléfonos ni emails. Los logs de errores no llevan datos personales.
6. Carpetas de perfiles de navegador, sesiones y capturas de depuración están en `.gitignore`: no forzarlas al repo.
7. El navegador remoto (Fase 2) solo muestra la página de login/registro de la tienda; el usuario escribe y resuelve CAPTCHA/2FA él mismo.
