import type { Size, Unit } from './types.js';

// Normalizador de formatos comerciales → tamaño en kg, L o ud.
// Si el texto no se entiende, devuelve null: nunca se adivina un tamaño.

const UNIT_FACTORS: Record<string, { unit: Unit; factor: number }> = {
  kg: { unit: 'kg', factor: 1 },
  kilo: { unit: 'kg', factor: 1 },
  kilos: { unit: 'kg', factor: 1 },
  g: { unit: 'kg', factor: 0.001 },
  gr: { unit: 'kg', factor: 0.001 },
  grs: { unit: 'kg', factor: 0.001 },
  gramos: { unit: 'kg', factor: 0.001 },
  l: { unit: 'l', factor: 1 },
  lt: { unit: 'l', factor: 1 },
  lts: { unit: 'l', factor: 1 },
  litro: { unit: 'l', factor: 1 },
  litros: { unit: 'l', factor: 1 },
  cl: { unit: 'l', factor: 0.01 },
  ml: { unit: 'l', factor: 0.001 },
  ud: { unit: 'ud', factor: 1 },
  uds: { unit: 'ud', factor: 1 },
  u: { unit: 'ud', factor: 1 },
  unidad: { unit: 'ud', factor: 1 },
  unidades: { unit: 'ud', factor: 1 },
  docena: { unit: 'ud', factor: 12 },
  docenas: { unit: 'ud', factor: 12 },
  rollos: { unit: 'ud', factor: 1 },
  rollo: { unit: 'ud', factor: 1 },
  lavados: { unit: 'ud', factor: 1 },
};

const UNIT_RE = Object.keys(UNIT_FACTORS)
  .sort((a, b) => b.length - a.length)
  .join('|');

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;

function toNumber(s: string): number {
  return Number(s.replace(',', '.'));
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export interface ParsedFormat {
  size: Size;
  /** Número de piezas si el formato es un pack ("6 x 1 L" → 6). */
  pieces: number | null;
}

/**
 * Lee el formato de un texto de producto o de su campo de formato.
 * Ejemplos: "pack 6 x 1 L", "6x1l", "500 g", "1,5 kg", "12 ud", "2 x 125 g", "75 cl", "1 docena".
 */
export function parseFormat(text: string | null | undefined): ParsedFormat | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/ /g, ' ');

  // "6 x 1 l", "pack 4 x 125 g", "2x500ml"
  const pack = t.match(new RegExp(String.raw`${NUM}\s*[x×]\s*${NUM}\s*(${UNIT_RE})\b`));
  if (pack) {
    const count = toNumber(pack[1]!);
    const each = toNumber(pack[2]!);
    const u = UNIT_FACTORS[pack[3]!]!;
    if (count > 0 && each > 0) {
      return { size: { qty: round(count * each * u.factor), unit: u.unit }, pieces: count };
    }
  }

  // "1 docena", "media docena"
  if (/media docena/.test(t)) return { size: { qty: 6, unit: 'ud' }, pieces: 6 };

  // "500 g", "1,5 kg", "12 ud"
  const single = t.match(new RegExp(String.raw`${NUM}\s*(${UNIT_RE})\b`));
  if (single) {
    const n = toNumber(single[1]!);
    const u = UNIT_FACTORS[single[2]!]!;
    if (n > 0) {
      const qty = round(n * u.factor);
      return { size: { qty, unit: u.unit }, pieces: u.unit === 'ud' ? qty : null };
    }
  }
  return null;
}

/** Precio por kg, L o ud. null si falta el tamaño. */
export function unitPrice(price: number, size: Size | null): number | null {
  if (!size || size.qty <= 0) return null;
  return round(price / size.qty);
}

/** Formatea 1.234 → "1,23 €" */
export function formatEuro(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

export const UNIT_LABEL: Record<Unit, string> = { kg: 'kg', l: 'L', ud: 'ud' };
