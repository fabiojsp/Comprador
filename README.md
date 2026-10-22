# Cesta Mallorca

Compara tu compra de supermercado online en Mallorca **con el envío incluido** y te deja el carrito listo en la tienda más barata. Tú solo revisas y pagas.

> Estado: **Fase 0 terminada** (verificación de tiendas). La app (PWA para iPhone) llega en la Fase 1.
> Qué tienda reparte dónde y cuánto cuesta el envío: [`docs/TIENDAS.md`](docs/TIENDAS.md).

## Qué necesitas en tu Mac

Hoy solo hace falta para una cosa: verificar desde la conexión de casa las tiendas que bloquean los servidores en la nube (Carrefour, Eroski y El Corte Inglés).

1. **Instala Node.js 22.**
   1. Ve a <https://nodejs.org>.
   2. Descarga la versión "LTS" para macOS (22 o superior).
   3. Instálala como cualquier programa.
2. **Descarga el proyecto.**
   1. Abre la app **Terminal** (Aplicaciones → Utilidades → Terminal).
   2. Pega esto y pulsa Enter:
      ```bash
      git clone https://github.com/fabiojsp/Comprador.git
      cd Comprador
      ```
      Si macOS te pide instalar las "herramientas de línea de comandos", acepta y repite el paso.
3. **Instala las dependencias y el navegador de pruebas** (solo la primera vez, tarda unos minutos):
   ```bash
   npm install
   npx playwright install chromium
   ```
4. **Lanza la verificación desde casa:**
   ```bash
   npm run verify-stores -- --label "Mac casa"
   ```
   Tarda unos 5 minutos. Verás una línea por tienda y CP. Al terminar, `docs/TIENDAS.md` tiene un bloque nuevo, "Red: Mac casa".
5. **Comparte el resultado** con Claude: haz commit y push, o pega la salida de la Terminal en el chat.

Si una tienda te muestra un CAPTCHA o "verificación de seguridad" también desde casa, la app **no** lo resolverá por ti. Se queda como "sin dato" y lo decidimos juntos.

## Comandos

| Comando | Para qué |
|---|---|
| `npm test` | Ejecuta los tests (no necesita internet) |
| `npm run typecheck` | Comprueba los tipos de TypeScript |
| `npm run verify-stores` | Verifica en vivo cobertura y envío en 07009, 07300 y 07360 |
| `npm run verify-stores -- --cp 07350 --town Binissalem` | Verifica otro CP o población |
| `npm run verify-stores -- --store alcampo` | Verifica solo una tienda |

## Documentos

- [`SPEC.md`](SPEC.md): especificación completa y decisiones.
- [`CLAUDE.md`](CLAUDE.md): reglas del repositorio (stack, convenciones y seguridad).
- [`docs/TIENDAS.md`](docs/TIENDAS.md): estado verificado de cada tienda.
- [`docs/FRAGILIDAD.md`](docs/FRAGILIDAD.md): qué partes se rompen con más facilidad y cómo detectarlo.
