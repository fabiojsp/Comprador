import { describe, expect, it } from 'vitest';
import { parseFormat, unitPrice } from '../src/normalize.js';

describe('parseFormat', () => {
  it.each([
    ['pack 6 x 1 L', { qty: 6, unit: 'l' }, 6],
    ['6x1l', { qty: 6, unit: 'l' }, 6],
    ['Pack 4 x 125 g', { qty: 0.5, unit: 'kg' }, 4],
    ['2 x 500 ml', { qty: 1, unit: 'l' }, 2],
    ['500 g', { qty: 0.5, unit: 'kg' }, null],
    ['1,5 kg', { qty: 1.5, unit: 'kg' }, null],
    ['75 cl', { qty: 0.75, unit: 'l' }, null],
    ['330 ml', { qty: 0.33, unit: 'l' }, null],
    ['12 ud', { qty: 12, unit: 'ud' }, 12],
    ['1 docena', { qty: 12, unit: 'ud' }, 12],
    ['media docena', { qty: 6, unit: 'ud' }, 6],
    ['Papel higiénico 12 rollos', { qty: 12, unit: 'ud' }, 12],
  ])('%s', (text, size, pieces) => {
    expect(parseFormat(text)).toEqual({ size, pieces });
  });

  it('no confunde palabras que empiezan como una unidad', () => {
    expect(parseFormat('2 galletas')).toBeNull();
    expect(parseFormat('3 uvas')).toBeNull();
  });

  it('sin formato → null (nunca adivina)', () => {
    expect(parseFormat('Pan de pueblo')).toBeNull();
    expect(parseFormat('')).toBeNull();
    expect(parseFormat(null)).toBeNull();
  });
});

describe('unitPrice', () => {
  it('pack de 6 L a 4,98 € → 0,83 €/L', () => expect(unitPrice(4.98, { qty: 6, unit: 'l' })).toBe(0.83));
  it('sin tamaño → null', () => expect(unitPrice(2, null)).toBeNull());
});
