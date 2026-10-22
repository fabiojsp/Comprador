import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { detectBlock } from './block-detect.js';
import type { BlockKind } from '@cesta/core';

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

export async function launchBrowser(opts: { headless?: boolean } = {}): Promise<Browser> {
  return chromium.launch({
    headless: opts.headless ?? true,
    // Permite usar un Chromium ya instalado (p. ej. en contenedores) sin descargar otro.
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
}

export async function newStoreContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 900 },
  });
}

export interface OpenResult {
  status: number | null;
  title: string;
  blockedBy: BlockKind | null;
}

/** Abre una URL y comprueba si la tienda nos muestra una página de protección. */
export async function openAndCheck(page: Page, url: string, settleMs = 4000): Promise<OpenResult> {
  let status: number | null = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    status = resp?.status() ?? null;
  } catch {
    return { status: null, title: '', blockedBy: 'network' };
  }
  await page.waitForTimeout(settleMs);
  const title = await page.title().catch(() => '');
  const body = await page.content().catch(() => '');
  return { status, title, blockedBy: detectBlock({ status, title, body }) };
}

/** Acepta el banner de cookies si aparece (no es un consentimiento legal de compra). */
export async function dismissCookies(page: Page): Promise<void> {
  const candidates = [
    page.locator('#onetrust-accept-btn-handler'),
    page.getByRole('button', { name: /aceptar (todas|todo|cookies)/i }),
    page.getByText('Aceptar todas', { exact: true }),
  ];
  for (const c of candidates) {
    if (await c.first().isVisible().catch(() => false)) {
      await c.first().click().catch(() => undefined);
      return;
    }
  }
}
