import { describe, expect, it } from 'vitest';
import { detectBlock } from '../src/shared/block-detect.js';
import { fixture } from './fixtures.js';

const titleOf = (html: string) => html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';

describe('detectBlock', () => {
  it('reconoce el desafío de Cloudflare (Carrefour)', () => {
    const html = fixture('blocks/cloudflare-carrefour.html');
    expect(detectBlock({ status: 403, title: titleOf(html), body: html })).toBe('cloudflare');
  });

  it('reconoce el "Access Denied" de Akamai (El Corte Inglés)', () => {
    const html = fixture('blocks/akamai-eci.html');
    expect(detectBlock({ status: 403, title: titleOf(html), body: html })).toBe('akamai');
  });

  it('reconoce la comprobación reCAPTCHA aunque el HTTP sea 200 (Eroski)', () => {
    const html = fixture('blocks/recaptcha-eroski.html');
    expect(detectBlock({ status: 200, title: titleOf(html), body: html })).toBe('recaptcha');
  });

  it('no marca como bloqueo una página normal', () => {
    expect(detectBlock({ status: 200, title: 'Inicio - Alcampo', body: '<html><body>Ofertas</body></html>' })).toBeNull();
  });

  it('marca otros errores HTTP como http_error', () => {
    expect(detectBlock({ status: 500, title: 'Error', body: '' })).toBe('http_error');
  });
});
