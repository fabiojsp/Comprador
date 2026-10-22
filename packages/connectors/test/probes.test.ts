import { describe, expect, it } from 'vitest';
import { parseCoverageResponse, parseDeliveryTermsFromHelp, type HelpArticle } from '../src/stores/mercadona/probe.js';
import { parseDeliverability, parseTermsPage } from '../src/stores/alcampo/probe.js';
import { parseLoginPageTerms, pickTownOption, type TownOption } from '../src/stores/hipercentro/probe.js';
import { classifyLidlSearch } from '../src/stores/reference-probes.js';
import { parseEuro } from '../src/shared/probe.js';
import { fixture, fixtureJson, NOW } from './fixtures.js';

describe('parseEuro', () => {
  it.each([
    ['8,20€', 8.2],
    ['7,00 €', 7],
    ['60€.', 60],
    ['6,95€', 6.95],
    ['9,90EUR', 9.9],
  ])('%s → %d', (text, expected) => expect(parseEuro(text)).toBe(expected));

  it('devuelve null si no hay importe', () => expect(parseEuro('gratis')).toBeNull());
});

describe('Mercadona', () => {
  it('200 + almacén → reparte', () => {
    const c = parseCoverageResponse('07360', 200, '4519', '{"warehouse_changed":false}', NOW);
    expect(c).toMatchObject({ status: 'delivers', source: 'live', storeRef: { warehouse: '4519' } });
  });

  it('404 "outside of our working area" → no reparte', () => {
    const c = parseCoverageResponse('07870', 404, null, '{"error_msg":"This zip code is outside of our working area"}', NOW);
    expect(c.status).toBe('no_delivery');
  });

  it('403 → sin dato, nunca "no reparte"', () => {
    const c = parseCoverageResponse('07009', 403, null, 'Access Denied', NOW);
    expect(c).toMatchObject({ status: 'unknown', source: 'none' });
  });

  it('lee coste, mínimo y horario de las FAQ oficiales', () => {
    const art = (id: string) => fixtureJson<{ article: HelpArticle }>(`mercadona/help-${id}.json`).article;
    const t = parseDeliveryTermsFromHelp(
      '07360',
      { deliveryCost: art('360000857071'), minOrder: art('360000841092'), slots: art('360000840672') },
      NOW,
    );
    expect(t).toMatchObject({ baseCost: 8.2, minOrder: 60, freeFrom: null, source: 'official_doc', loginToSeePrices: false });
    expect(t.slots[0]).toMatchObject({ from: '7:00', to: '22:00' });
  });

  it('sin artículos → sin dato, no se inventa nada', () => {
    const t = parseDeliveryTermsFromHelp('07360', {}, NOW);
    expect(t).toMatchObject({ baseCost: null, minOrder: null, source: 'none' });
  });
});

describe('Alcampo', () => {
  it('lee la tarifa "Nacional" y no la de Madrid', () => {
    const t = parseTermsPage('07360', fixture('alcampo/servicios-entrega-recogida.txt'), NOW);
    expect(t.baseCost).toBe(7);
    expect(t.minOrder).toBe(0);
    expect(t.slots.find((s) => s.label === 'mismo día')?.cost).toBe(9.9);
    expect(t.source).toBe('official_doc');
  });

  it('DELIVERABLE + HOME_DELIVERY → reparte', () => {
    const c = parseDeliverability('07360', { postalCode: '07360', deliverability: 'DELIVERABLE', deliveryMethod: 'HOME_DELIVERY', resolvedRegionId: 'r1' }, true, NOW);
    expect(c).toMatchObject({ status: 'delivers', pickup: true, storeRef: { regionId: 'r1' } });
  });

  it('NOT_DELIVERABLE con recogida → solo recogida', () => {
    const c = parseDeliverability('07800', { postalCode: '07800', deliverability: 'NOT_DELIVERABLE' }, true, NOW);
    expect(c.status).toBe('pickup_only');
  });

  it('estado desconocido → sin dato', () => {
    const c = parseDeliverability('07360', { postalCode: '07360', deliverability: 'MAYBE' }, false, NOW);
    expect(c).toMatchObject({ status: 'unknown', source: 'none' });
  });
});

describe('Hiper Centro', () => {
  const options = fixtureJson<TownOption[]>('hipercentro/poblaciones-mallorca.json');

  it('Palma 07001–07015 → "Palma Ciudad y Alrededores"', () => {
    expect(pickTownOption('07009', 'Palma', options)?.label).toMatch(/Palma Ciudad/);
  });

  it('Inca → "Inca" y no "Ventura Inca"', () => {
    expect(pickTownOption('07300', 'Inca', options)?.label).toBe('Inca');
  });

  it('Lloseta y nombres con acentos o mayúsculas', () => {
    expect(pickTownOption('07360', 'Lloseta', options)?.value).toBe('9280');
    expect(pickTownOption('07350', 'binissalem', options)?.label).toBe('Binissalem');
  });

  it('población que no está → null', () => {
    expect(pickTownOption('07999', 'Atlántida', options)).toBeNull();
  });

  it('lee gastos de servicio y "sin importe mínimo"', () => {
    const t = parseLoginPageTerms('07360', fixture('hipercentro/login-lloseta.txt'), NOW, 'https://tuhiper.com/A9/Login.aspx?p_IdCP=9280');
    expect(t).toMatchObject({ baseCost: 6.95, minOrder: 0, loginToSeePrices: false, source: 'live' });
  });
});

describe('Lidl', () => {
  it('la búsqueda "leche" no devuelve leche → solo bazar (aunque haya algún gourmet)', () => {
    const names = fixtureJson<string[]>('lidl/busqueda-leche-titulos.json');
    const { staples, others } = classifyLidlSearch('leche', names);
    expect(staples).toEqual([]);
    expect(others).toContain('Cuña de queso viejo de oveja');
  });

  it('si aparece leche, se detecta', () => {
    expect(classifyLidlSearch('leche', ['Leche entera 1 L', 'Espumador de leche']).staples).toEqual(['Leche entera 1 L']);
  });
});
