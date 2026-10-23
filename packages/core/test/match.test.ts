import { describe, expect, it } from 'vitest';
import { matchItem, toCandidate, tokens } from '../src/match.js';
import type { ListItem } from '../src/basket.js';
import type { ProductOffer } from '../src/types.js';

function offer(p: Partial<ProductOffer> & Pick<ProductOffer, 'ref' | 'name' | 'price'>): ProductOffer {
  return {
    storeId: 'mercadona',
    brand: null,
    isStoreBrand: null,
    formatText: null,
    size: null,
    pieces: null,
    storeUnitPrice: null,
    storeUnit: null,
    promo: null,
    available: true,
    category: [],
    url: null,
    imageUrl: null,
    fetchedAt: '2026-10-23T08:00:00Z',
    ...p,
  };
}

const leche: ListItem = {
  id: 'leche', defId: 'leche', name: 'Leche semidesnatada', category: 'Lácteos y huevos',
  query: 'leche semidesnatada', qty: 5, unit: 'l', checked: true, avoid: ['sin lactosa'],
};

const packHacendado = offer({ ref: '10381', name: 'Leche semidesnatada Hacendado', brand: 'Hacendado', isStoreBrand: true, price: 4.98, size: { qty: 6, unit: 'l' }, pieces: 6 });
const brikPuleva = offer({ ref: 'p1', name: 'Leche semidesnatada Puleva', brand: 'Puleva', isStoreBrand: false, price: 1.35, size: { qty: 1, unit: 'l' }, pieces: 1 });
const sinLactosa = offer({ ref: 'sl', name: 'Leche semidesnatada sin lactosa Hacendado', isStoreBrand: true, price: 4.2, size: { qty: 6, unit: 'l' } });
const garrafa = offer({ ref: 'big', name: 'Leche semidesnatada 12 L', price: 8, size: { qty: 12, unit: 'l' } });

describe('tokens', () => {
  it('quita acentos, plurales y palabras vacías', () => {
    expect(tokens('Patatas de la huerta')).toEqual(['patata', 'huerta']);
    expect(tokens('Atún en aceite')).toEqual(['atun', 'aceite']);
  });
});

describe('toCandidate', () => {
  it('calcula unidades a comprar y coste', () => {
    expect(toCandidate(leche, packHacendado)).toMatchObject({ units: 1, cost: 4.98, unitPrice: 0.83 });
    expect(toCandidate(leche, brikPuleva)).toMatchObject({ units: 5, cost: 6.75 });
  });

  it('descarta palabras a evitar', () => expect(toCandidate(leche, sinLactosa)).toBeNull());

  it('descarta formatos de más del doble de lo necesario', () => expect(toCandidate(leche, garrafa)).toBeNull());

  it('descarta si falta la palabra principal', () => {
    expect(toCandidate(leche, offer({ ref: 'x', name: 'Batido de cacao semidesnatado', price: 2, size: { qty: 1, unit: 'l' } }))).toBeNull();
  });

  it('descarta si no hay tamaño comparable (nunca adivina)', () => {
    expect(toCandidate(leche, offer({ ref: 'y', name: 'Leche semidesnatada', price: 1 }))).toBeNull();
  });

  it('artículos en unidades usan las piezas del pack', () => {
    const huevos: ListItem = { id: 'huevos', defId: 'huevos', name: 'Huevos', category: 'Lácteos y huevos', query: 'huevos L', qty: 12, unit: 'ud', checked: true };
    const docena = offer({ ref: 'h', name: 'Huevos frescos L', price: 2.7, size: { qty: 12, unit: 'ud' }, pieces: 12 });
    expect(toCandidate(huevos, docena)).toMatchObject({ units: 1, cost: 2.7, unitPrice: 0.225 });
  });
});

describe('matchItem', () => {
  it('elige el más barato por precio unitario', () => {
    const r = matchItem(leche, [brikPuleva, packHacendado, sinLactosa], { brand: 'any' });
    expect(r.best?.offer.ref).toBe('10381');
    expect(r.confidence).toBe('high');
  });

  it('respeta la preferencia de marca de fabricante', () => {
    expect(matchItem(leche, [brikPuleva, packHacendado], { brand: 'maker' }).best?.offer.ref).toBe('p1');
  });

  it('respeta un producto fijado por el usuario', () => {
    expect(matchItem(leche, [brikPuleva, packHacendado], { brand: 'any', pinnedRef: 'p1' }).best?.offer.ref).toBe('p1');
  });

  it('marca concreta exigida en el artículo', () => {
    expect(matchItem({ ...leche, brand: 'Puleva' }, [brikPuleva, packHacendado], { brand: 'any' }).best?.offer.ref).toBe('p1');
  });

  it('sin candidatos → confidence none', () => {
    expect(matchItem(leche, [sinLactosa], { brand: 'any' })).toMatchObject({ best: null, confidence: 'none' });
  });
});

describe('formatos grandes de despensa', () => {
  const lentejas: ListItem = { id: 'lentejas', defId: 'lentejas', name: 'Lentejas', category: 'Despensa', query: 'lentejas', qty: 0.25, unit: 'kg', checked: true };
  const kilo = offer({ ref: 'l1', name: 'Lenteja pardina Hacendado', price: 1.85, size: { qty: 1, unit: 'kg' } });

  it('no caduca y no hay formato pequeño → acepta el de 1 kg avisando', () => {
    const r = matchItem(lentejas, [kilo], { brand: 'any' });
    expect(r.best?.offer.ref).toBe('l1');
    expect(r.reason).toMatch(/Formato grande/);
  });

  it('perecedero → no acepta formatos de más del doble', () => {
    expect(matchItem({ ...lentejas, perishable: true }, [kilo], { brand: 'any' }).best).toBeNull();
  });
});
