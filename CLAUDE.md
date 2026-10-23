# CLAUDE.md — Cesta Mallorca

PWA (iPhone) que compara la compra online de supermercado en Mallorca **con el envío incluido** en Mercadona, Carrefour y Eroski (más Alcampo e Hiper Centro como extra), y devuelve la lista de la tienda más barata con enlaces a cada producto.
- Especificación: `SPEC.md` (versión simple).
- Estado real de cada tienda: `docs/TIENDAS.md`, que manda sobre cualquier suposición.

El usuario no es técnico y solo usa el iPhone: **nada debe requerir instalar o ejecutar algo en su ordenador** (el Mac va con él). Carrefour y Eroski bloquean la nube: se leen con un **atajo del iPhone** que consulta desde Safari con la conexión del usuario y envía las páginas en bruto a la app, que las interpreta en el servidor (parsers con fixtures).

## Stack
- Monorepo con npm workspaces, TypeScript estricto, Node 22.
- `apps/web`: Next.js (App Router) + Tailwind. PWA móvil primero. Rutas API que llaman a los conectores. Publicado en **Netlify** (<https://cesta-mallorca.netlify.app>, proyecto `cesta-mallorca`, `netlify.toml` + `@netlify/plugin-nextjs`).
- `packages/core`: lógica pura y tipos (normalizador, emparejador, optimizador, cesta base). Sin E/S.
- `packages/connectors`: un conector por tienda (`src/stores/<id>/`) + utilidades compartidas (`src/shared/`) + `fixtures/` + `test/`.
- Sin base de datos en esta versión: perfil y listas viven en el iPhone (almacenamiento local de la PWA).

## Comandos
| Comando | Qué hace |
|---|---|
| `npm test` | Vitest: lógica y conectores contra fixtures (sin internet) |
| `npm run typecheck` | `tsc --noEmit` de todo el repo |
| `npm run verify-stores -- [--cp 07360] [--store mercadona] [--label nube]` | Verificación en vivo de cobertura y envío; regenera el bloque de esa red en `docs/TIENDAS.md` |
| `npm run dev` / `npm run build` | PWA en local (necesita `apps/web/.env.local` con `APP_PASSWORD` y `APP_SESSION_SECRET`) |
| `npm run e2e` | Prueba de punta a punta en un iPhone simulado contra `BASE` (por defecto localhost:3100) |
| `npx tsx scripts/try-mercadona.ts` | Compara en vivo la cesta de un perfil en Mercadona y muestra cada emparejado |

En el contenedor de Claude, para que `fetch` use el proxy: `NODE_USE_ENV_PROXY=1`.

Publicar: conector de Netlify → `deploy-site` del proyecto `380661dd-b20f-4030-8c0e-f6f51f9ca670`; ejecuta desde la raíz del repo el comando `npx @netlify/mcp ...` que devuelve. Ojo: el conector no guarda variables marcadas como secretas (responde OK pero no se crean); usar variables normales con ámbito `all` y comprobar con `getAllEnvVars`.

## Convenciones
- Código e identificadores en inglés; textos de interfaz, documentación y commits en español.
- Ningún precio, coste de envío o cobertura sin `source` (`live` | `official_doc`) y fecha. Si no hay dato: `null` / `'unknown'`, y se muestra "sin dato" con la fecha del último intento. **Nunca inventar ni deducir.**
- Las funciones de parseo de cada tienda son puras y se exportan para testearlas con fixtures reales guardadas en `packages/connectors/fixtures/<tienda>/`.
- Fuente de datos por orden:
  1. API JSON pública que usa la propia web.
  2. HTML.
  3. Navegador ligero solo si la web lo exige (Alcampo, para fijar la región).
  4. **Nunca** saltarse protecciones.
- Ritmo humano: todas las peticiones a una tienda pasan por un `Pacer` (`shared/pace.ts`): una cada vez, pausas aleatorias de 1,5–4 s, máx. `STORE_MAX_REQ_PER_MIN` (20 por defecto).
- Un precio con más de 7 días se marca "desactualizado".
- Al cerrar cada fase:
  - Tests en verde y `typecheck` limpio.
  - Commit y push.
  - Resumen corto para el usuario.
  - Actualizar `docs/FRAGILIDAD.md`.

## Reglas de seguridad (no negociables)
1. **No** resolver, automatizar ni esquivar CAPTCHAs ni desafíos anti-bot (Cloudflare, Akamai, reCAPTCHA, AWS WAF), ni usar proxies para evadirlos. Si una web bloquea: `blockedBy` + "sin dato".
2. **No** iniciar sesión en tiendas, **no** completar pagos, **no** aceptar condiciones legales.
3. Secretos solo en variables de entorno (`.env` local, no versionado; variables de entorno de Netlify en producción). Documentados en `.env.example`.
4. Nunca registrar en logs ni devolver en errores la dirección del usuario ni la contraseña de la app.
5. Carpetas de capturas o depuración (`.debug/`) en `.gitignore`.
