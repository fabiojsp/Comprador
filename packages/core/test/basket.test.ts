import { describe, expect, it } from 'vitest';
import { generateBasket } from '../src/basket.js';
import { consumptionUnits, type FamilyProfile } from '../src/profile.js';

const base: FamilyProfile = {
  members: ['adult', 'adult'],
  address: { street: 'Carrer Major 1', cp: '07360', town: 'Lloseta' },
  brand: 'any',
  restrictions: [],
  pets: { dog: false, cat: false },
  frequency: 'weekly',
};
const find = (items: ReturnType<typeof generateBasket>, id: string) => items.find((i) => i.id === id);

describe('consumptionUnits', () => {
  it('suma los factores por edad', () => {
    expect(consumptionUnits(['adult', 'adult', '4-11', '0-3'])).toBe(3.1);
    expect(consumptionUnits(['65+'])).toBe(0.85);
  });
});

describe('generateBasket', () => {
  it('2 adultos, semanal: leche 5 L, huevos 12, sin bebé ni mascotas', () => {
    const items = generateBasket(base);
    expect(find(items, 'leche')?.qty).toBe(5);
    expect(find(items, 'huevos')?.qty).toBe(12);
    expect(items.some((i) => i.category === 'Bebé' || i.category === 'Mascotas')).toBe(false);
    expect(find(items, 'cerveza')?.qty).toBe(2);
    expect(find(items, 'cacao')).toBeUndefined(); // sin niños
    expect(items.length).toBeGreaterThan(60);
  });

  it('quincenal duplica lo que va por persona', () => {
    expect(find(generateBasket({ ...base, frequency: 'biweekly' }), 'leche')?.qty).toBe(10);
  });

  it('los productos de reposición larga salen desmarcados', () => {
    const det = find(generateBasket(base), 'detergente');
    expect(det).toMatchObject({ checked: false, restock: true, qty: 2 });
    const pizza = find(generateBasket(base), 'pizza');
    expect(pizza).toMatchObject({ checked: true, qty: 1 });
  });

  it('bebé y mascotas añaden sus categorías', () => {
    const items = generateBasket({ ...base, members: ['adult', 'adult', '0-3'], pets: { dog: true, cat: false } });
    expect(find(items, 'panales')?.qty).toBe(40);
    expect(find(items, 'pienso-perro')).toBeDefined();
    expect(find(items, 'pienso-gato')).toBeUndefined();
  });

  it('sin lactosa cambia la búsqueda y quita el "evitar sin lactosa"', () => {
    const leche = find(generateBasket({ ...base, restrictions: ['lactose_free'] }), 'leche')!;
    expect(leche.query).toBe('leche semidesnatada sin lactosa');
    expect(leche.avoid).not.toContain('sin lactosa');
    expect(find(generateBasket({ ...base, restrictions: ['lactose_free'] }), 'queso-rallado')).toBeUndefined();
  });

  it('vegetariano quita carne y pescado y añade tofu', () => {
    const items = generateBasket({ ...base, restrictions: ['vegetarian'] });
    expect(find(items, 'pechuga')).toBeUndefined();
    expect(find(items, 'atun')).toBeUndefined();
    expect(find(items, 'tofu')).toBeDefined();
  });

  it('halal quita cerdo y cerveza', () => {
    const items = generateBasket({ ...base, restrictions: ['halal'] });
    expect(find(items, 'lomo')).toBeUndefined();
    expect(find(items, 'cerveza')).toBeUndefined();
    expect(find(items, 'carne-picada')?.query).toBe('carne picada vacuno');
  });
});
