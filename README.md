# Cesta Mallorca

Compara tu compra de supermercado en **Mercadona, Carrefour y Eroski** (y Alcampo e Hiper Centro como extra) con el envío incluido y te dice dónde sale más barata. Te da la lista final con un enlace a cada producto.

**Solo necesitas el iPhone.** No hay que instalar nada en el ordenador.

## Cómo usarla
1. Abre en Safari <https://cesta-mallorca.netlify.app>.
2. Pulsa el botón Compartir → **"Añadir a pantalla de inicio"**. A partir de ahí se abre como una app.
3. Escribe la contraseña de la app (solo la primera vez).
4. Rellena tu perfil (personas, edades y dirección) y pulsa **Comparar**.

## Dónde está publicada
- App: <https://cesta-mallorca.netlify.app>
- Panel de Netlify: <https://app.netlify.com/projects/cesta-mallorca>
- La contraseña de la app está en el panel: *Project configuration → Environment variables → `APP_PASSWORD`*. Si la cambias ahí, vuelve a publicar (*Deploys → Trigger deploy*).

## Estado
- **Fase 0 ✅**: verificación de tiendas. Ver [`docs/TIENDAS.md`](docs/TIENDAS.md).
- **Fase 1**: lógica de la cesta, Mercadona y la app en el iPhone (publicada); Carrefour y Eroski con el atajo del iPhone (en curso).
- **Fase 2**: Alcampo e Hiper Centro.

## Documentos
- [`SPEC.md`](SPEC.md): qué hace la app y cómo.
- [`CLAUDE.md`](CLAUDE.md): reglas del proyecto.
- [`docs/TIENDAS.md`](docs/TIENDAS.md): estado verificado de cada tienda.
- [`docs/FRAGILIDAD.md`](docs/FRAGILIDAD.md): qué se rompe con más facilidad y cómo detectarlo.
