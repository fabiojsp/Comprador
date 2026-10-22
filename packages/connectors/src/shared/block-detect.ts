import type { BlockKind } from '@cesta/core';

export interface BlockCheckInput {
  status: number | null;
  title: string;
  /** Texto visible o HTML de la página (basta con el principio). */
  body: string;
}

/**
 * Detecta páginas de protección anti-bot. Solo detecta: la app NUNCA intenta
 * resolver ni esquivar estas protecciones; la tienda queda "sin dato".
 */
export function detectBlock({ status, title, body }: BlockCheckInput): BlockKind | null {
  const t = title.toLowerCase();
  const b = body.slice(0, 20_000).toLowerCase();

  if (t.includes('un momento') || t.includes('just a moment') || b.includes('cf-chl') || b.includes('ray id:')) {
    return 'cloudflare';
  }
  if (t.includes('access denied') || b.includes('errors.edgesuite.net')) {
    return 'akamai';
  }
  if (t.includes('comprobando tu navegador') || (t.includes('recaptcha') && b.includes('comprobando'))) {
    return 'recaptcha';
  }
  if (b.includes('awswaf') && b.includes('captcha') && (status === 403 || status === 405)) {
    return 'aws_waf';
  }
  if (status !== null && status >= 400) {
    return 'http_error';
  }
  return null;
}

export const BLOCK_LABEL: Record<BlockKind, string> = {
  cloudflare: 'Cloudflare (desafío anti-bot)',
  akamai: 'Akamai ("Access Denied")',
  recaptcha: 'Comprobación reCAPTCHA del navegador',
  aws_waf: 'AWS WAF (CAPTCHA)',
  network: 'Sin respuesta de red',
  http_error: 'Error HTTP',
};
