# Cesta Mallorca

Compara tu compra de supermercado en **Mercadona, Alcampo e Hiper Centro** con el envío incluido y te dice dónde sale más barata. Te da la lista final con un enlace a cada producto.

**Solo necesitas el iPhone.** No hay que instalar nada en el ordenador.

## Cómo usarla (cuando esté publicada, Fase 1)
1. Abre en Safari el enlace de la app que te pasará Claude.
2. Pulsa el botón Compartir → **"Añadir a pantalla de inicio"**. A partir de ahí se abre como una app.
3. Escribe la contraseña de la app (solo la primera vez).
4. Rellena tu perfil (personas, edades y dirección) y pulsa **Comparar**.

## Publicar en Vercel (una sola vez, 5 minutos, desde el móvil o el Mac)
1. Entra en <https://vercel.com/new> con tu cuenta.
2. En **Import Git Repository** elige `fabiojsp/Comprador`. Si no aparece, pulsa **Adjust GitHub App Permissions** y dale acceso a ese repositorio.
3. **Project Name**: `cesta-mallorca`.
4. **Root Directory**: pulsa *Edit* y elige `apps/web`.
5. **Environment Variables**: añade estas dos (los valores te los da Claude; no los subas a GitHub):
   - `APP_PASSWORD`: la contraseña para entrar en la app.
   - `APP_SESSION_SECRET`: una clave larga aleatoria.
6. Pulsa **Deploy** y espera unos 2 minutos.

A partir de ahí, cada cambio que Claude suba a GitHub se publica solo.

## Estado
- **Fase 0 ✅**: verificación de tiendas. Ver [`docs/TIENDAS.md`](docs/TIENDAS.md).
- **Fase 1**: lógica de la cesta, Mercadona y la app en el iPhone.
- **Fase 2**: Alcampo e Hiper Centro.

## Documentos
- [`SPEC.md`](SPEC.md): qué hace la app y cómo.
- [`CLAUDE.md`](CLAUDE.md): reglas del proyecto.
- [`docs/TIENDAS.md`](docs/TIENDAS.md): estado verificado de cada tienda.
- [`docs/FRAGILIDAD.md`](docs/FRAGILIDAD.md): qué se rompe con más facilidad y cómo detectarlo.
