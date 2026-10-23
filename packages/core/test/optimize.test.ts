import { describe, expect, it } from 'vitest';
import { recommend, shippingFor, storeTotal, averageCosts, type StoreInput } from '../src/optimize.js';
import type { Candidate } from '../src/match.js';

const c = (cost: number): Candidate => ({ offer: {} as Candidate['offer'], units: 1, cost, unitPrice: cost, score: 1 });
const ids = ['a', 'b', 'c'];

const mercadona: StoreInput = { storeId: 'mercadona', matches: { a: c(30), b: c(20), c: c(15) }, terms: { baseCost: 8.2, minOrder: 60, freeFrom: null } };
const alcampo: StoreInput = { storeId: 'alcampo', matches: { a: c(25), b: c(30), c: null }, terms: { baseCost: 7, minOrder: 0, freeFrom: null } };
const hiper: StoreInput = { storeId: 'hipercentro', matches: { a: c(40), b: c(10), c: c(18) }, terms: { baseCost: 6.95, minOrder: 0, freeFrom: null } };

describe('shippingFor', () => {
  it('envío gratis desde el umbral', () => {
    expect(shippingFor({ baseCost: 4, minOrder: 0, freeFrom: 100 }, 120)).toEqual({ cost: 0, free: true });
    expect(shippingFor({ baseCost: 4, minOrder: 0, freeFrom: 100 }, 99.99)).toEqual({ cost: 4, free: false });
  });
  it('envío sin dato sigue siendo sin dato (nunca 0)', () => {
    expect(shippingFor({ baseCost: null, minOrder: null, freeFrom: null }, 50).cost).toBeNull();
  });
});

describe('storeTotal', () => {
  it('suma subtotal + envío y comprueba el mínimo', () => {
    const t = storeTotal(mercadona, ids, averageCosts([mercadona], ids));
    expect(t).toMatchObject({ subtotal: 65, total: 73.2, belowMinimumBy: 0, valid: true });
  });

  it('por debajo del mínimo → no válida con lo que falta', () => {
    const t = storeTotal(mercadona, ['a', 'b'], averageCosts([mercadona], ids));
    expect(t).toMatchObject({ subtotal: 50, belowMinimumBy: 10, valid: false });
  });

  it('penaliza no encontrados con el precio medio de las demás', () => {
    const avg = averageCosts([mercadona, alcampo, hiper], ids);
    expect(avg.c).toBe(16.5);
    const t = storeTotal(alcampo, ids, avg);
    expect(t).toMatchObject({ subtotal: 55, penalty: 16.5, missing: ['c'], total: 62, comparable: 78.5 });
  });

  it('envío sin dato → total null y no válida', () => {
    const t = storeTotal({ ...alcampo, terms: { baseCost: null, minOrder: 0, freeFrom: null } }, ['a'], {});
    expect(t).toMatchObject({ total: null, valid: false });
  });
});

describe('recommend', () => {
  it('mejor tienda única y par solo si ahorra más que el umbral', () => {
    const r = recommend([mercadona, alcampo, hiper], ids);
    // mercadona 73,20 · alcampo 62+16,5=78,5 · hiper 68+6,95=74,95
    expect(r.single?.storeId).toBe('mercadona');
    // Par alcampo(a 25 + 7) + hiper(b 10 + c 18 + 6,95): 32 + 34,95 = 66,95 → ahorra 6,25 > 5
    expect(r.pair?.stores).toEqual(['alcampo', 'hipercentro']);
    expect(r.pairSaving).toBe(6.25);
  });

  it('no recomienda par si el ahorro no supera el umbral', () => {
    const r = recommend([mercadona, alcampo, hiper], ids, 20);
    expect(r.pair).toBeNull();
    expect(r.single?.storeId).toBe('mercadona');
  });

  it('un par que deja a una tienda bajo su mínimo no es válido', () => {
    const merca2: StoreInput = { ...mercadona, matches: { a: c(5), b: c(100), c: c(100) } };
    const r = recommend([merca2, hiper], ids, 0);
    // Mercadona solo se quedaría "a" (5 €) < 60 € de mínimo
    expect(r.pair).toBeNull();
  });

  it('avisa de envío sin dato y de pedido mínimo', () => {
    const noTerms: StoreInput = { ...alcampo, storeId: 'carrefour', terms: { baseCost: null, minOrder: null, freeFrom: null } };
    const r = recommend([{ ...mercadona, matches: { a: c(10) } }, noTerms], ['a']);
    expect(r.warnings.join(' ')).toMatch(/carrefour: envío sin dato/);
    expect(r.warnings.join(' ')).toMatch(/mercadona: faltan 50,00/);
    expect(r.single).toBeNull();
  });
});
