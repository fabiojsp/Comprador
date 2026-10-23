// Perfil familiar y unidades de consumo (SPEC §6).

export type AgeRange = '0-3' | '4-11' | '12-17' | 'adult' | '65+';
export type BrandPreference = 'store' | 'maker' | 'any';
export type Restriction = 'gluten_free' | 'lactose_free' | 'vegetarian' | 'halal';
export type Frequency = 'weekly' | 'biweekly';

export interface Address {
  street: string;
  cp: string;
  town: string;
}

export interface FamilyProfile {
  members: AgeRange[];
  address: Address;
  brand: BrandPreference;
  restrictions: Restriction[];
  pets: { dog: boolean; cat: boolean };
  frequency: Frequency;
}

/** Factores por rango de edad (editables en el futuro desde Ajustes). */
export const AGE_FACTORS: Record<AgeRange, number> = {
  adult: 1,
  '12-17': 1,
  '65+': 0.85,
  '4-11': 0.7,
  '0-3': 0.4,
};

export const AGE_LABEL: Record<AgeRange, string> = {
  '0-3': '0–3 años',
  '4-11': '4–11 años',
  '12-17': '12–17 años',
  adult: 'Adulto',
  '65+': 'Más de 65',
};

export const RESTRICTION_LABEL: Record<Restriction, string> = {
  gluten_free: 'Sin gluten',
  lactose_free: 'Sin lactosa',
  vegetarian: 'Vegetariano',
  halal: 'Halal',
};

/** Unidades de consumo = suma de factores. */
export function consumptionUnits(members: AgeRange[], factors = AGE_FACTORS): number {
  return Math.round(members.reduce((sum, m) => sum + factors[m], 0) * 100) / 100;
}

export const weeksPerPurchase = (f: Frequency) => (f === 'weekly' ? 1 : 2);

export function isValidCp(cp: string): boolean {
  // Baleares: 07001–07999
  return /^07\d{3}$/.test(cp) && Number(cp) >= 7001;
}
