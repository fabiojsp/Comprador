import { describe, expect, it } from 'vitest';
import { BASKET, matchItem, type ListItem } from '@cesta/core';
import { parseHit, type MercadonaHit } from '../src/stores/mercadona/search.js';
import { fixtureJson, NOW } from './fixtures.js';

const offersFor = (file: string) =>
  fixtureJson<{ hits: MercadonaHit[] }>(`mercadona/search/${file}.json`)
    .hits.map((h) => parseHit(h, NOW))
    .filter((o) => o !== null);

function item(defId: string, qty: number): ListItem {
  const d = BASKET.find((b) => b.id === defId)!;
  return { id: d.id, defId: d.id, name: d.name, category: d.category, query: d.query, qty, unit: d.unit, avoid: d.avoid, checked: true };
}

describe('Mercadona parseHit', () => {
  it('pack de 6 briks: contenido total, piezas, €/L y marca blanca', () => {
    const o = offersFor('leche-semidesnatada').find((x) => x.name === 'Leche semidesnatada sin lactosa Hacendado' && x.pieces === 6)!;
    expect(o).toMatchObject({ price: 5.64, size: { qty: 6, unit: 'l' }, pieces: 6, storeUnitPrice: 0.94, storeUnit: 'l', isStoreBrand: true });
    expect(o.url).toMatch(/^https:\/\/tienda\.mercadona\.es\/product\//);
  });

  it('fruta por pieza con peso aproximado', () => {
    const o = offersFor('platano').find((x) => x.name === 'Plátano de Canarias IGP')!;
    expect(o).toMatchObject({ price: 0.43, size: { qty: 0.154, unit: 'kg' }, isStoreBrand: null });
    expect(o.formatText).toMatch(/peso aprox/);
  });

  it('papel higiénico: 12 rollos como piezas', () => {
    const o = offersFor('papel-higienico').find((x) => x.price === 4.6)!;
    expect(o.pieces).toBe(12);
  });
});

describe('Mercadona + emparejador (datos reales)', () => {
  it('leche 5 L → el brik de 1 L más barato por €/L, sin "sin lactosa"', () => {
    const r = matchItem(item('leche', 5), offersFor('leche-semidesnatada'), { brand: 'any' });
    expect(r.best?.offer.name).toBe('Leche semidesnatada Hacendado');
    expect(r.best?.unitPrice).toBe(0.83);
    expect(r.best?.units).toBe(5);
  });

  it('12 huevos → docena', () => {
    const r = matchItem(item('huevos', 12), offersFor('huevos-L'), { brand: 'any' });
    expect(r.best?.offer.name).toBe('Huevos grandes L');
    expect(r.best?.units).toBe(1);
    expect(r.best?.cost).toBe(3.05);
  });

  it('tomate fresco: descarta tomate frito y triturado', () => {
    const r = matchItem(item('tomate', 1), offersFor('tomate'), { brand: 'any' });
    expect(r.best?.offer.name).not.toMatch(/frito|triturado/i);
  });

  it('plátano: descarta purés y barritas por formato o palabra', () => {
    const r = matchItem(item('platano', 1.4), offersFor('platano'), { brand: 'any' });
    expect(r.best?.offer.name).toMatch(/Banana|Plátano/);
    expect(r.best?.offer.name).not.toMatch(/puré|Barritas/i);
  });

  it('papel higiénico: no elige el húmedo', () => {
    const r = matchItem(item('papel-higienico', 6), offersFor('papel-higienico'), { brand: 'any' });
    expect(r.best?.offer.name).not.toMatch(/húmedo/i);
  });

  it('pechuga de pollo: descarta lonchas y empanadas', () => {
    const r = matchItem(item('pechuga', 0.5), offersFor('pechuga-de-pollo'), { brand: 'any' });
    expect(r.best?.offer.name).not.toMatch(/lonchas|empanad/i);
  });
});

describe('Mercadona: tamaño derivado del precio de referencia', () => {
  it('sin unit_size pero con 5,25 €/kg a 5,25 € → 1 kg', () => {
    const hit = {
      id: 'x', display_name: 'Pescadilla de merluza sin cabeza Hacendado ultracongelada', brand: 'Hacendado', packaging: 'Paquete',
      published: true, share_url: null, thumbnail: null, categories: null, unavailable_from: null,
      price_instructions: { unit_price: '5.25', bulk_price: '5.25', reference_format: 'kg', unit_size: null, size_format: null, total_units: null, is_pack: false, previous_unit_price: null, price_decreased: false, approx_size: false },
    };
    expect(parseHit(hit, NOW)?.size).toEqual({ qty: 1, unit: 'kg' });
  });
});
