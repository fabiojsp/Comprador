// Prueba de punta a punta en un iPhone simulado:
//   BASE=http://localhost:3100 APP_PASSWORD=... node apps/web/e2e/flow.mjs
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:3100';
const OUT = process.env.OUT ?? '.debug';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'es-ES' });
const p = await ctx.newPage();
const t0 = Date.now();

await p.goto(`${BASE}/`);
await p.getByLabel('Contraseña de la app').fill('mal');
await p.getByRole('button', { name: 'Entrar' }).click();
await p.getByText('Contraseña incorrecta.').waitFor();
console.log('contraseña incorrecta → rechazada');
await p.getByLabel('Contraseña de la app').fill(process.env.APP_PASSWORD);
await p.getByRole('button', { name: 'Entrar' }).click();
await p.getByRole('heading', { name: 'Tu familia' }).waitFor();
await p.screenshot({ path: `${OUT}/1-perfil.png`, fullPage: true });

await p.getByLabel('Calle y número').fill('Carrer Major 1');
await p.getByLabel('Código postal').fill('07360');
await p.getByLabel('Población').fill('Lloseta');
await p.getByRole('button', { name: 'Guardar perfil' }).click();
await p.getByRole('heading', { name: 'Lista de la compra' }).waitFor();
await p.screenshot({ path: `${OUT}/2-lista.png`, fullPage: true });

await p.getByRole('button', { name: 'Comparar', exact: true }).click();
await p.getByText('Reparte en tu zona').waitFor({ timeout: 30000 });
await p.screenshot({ path: `${OUT}/3-tiendas.png`, fullPage: true });
await p.getByRole('button', { name: /^Comparar \d+ productos/ }).click();
await p.getByText(/Precios consultados/).waitFor({ timeout: 300000 });
console.log(`comparación en ${Math.round((Date.now() - t0) / 1000)} s`);
await p.screenshot({ path: `${OUT}/4-resultado.png`, fullPage: true });
console.log((await p.locator('main').innerText()).slice(0, 1500));
await b.close();
