import type { Browser } from 'playwright';
import type { Coverage, DeliveryContext, DeliveryTerms, StoreId } from '@cesta/core';

/** Entorno compartido por los sondeos: un único navegador perezoso y un reloj. */
export interface ProbeEnv {
  browser(): Promise<Browser>;
  now(): Date;
}

/**
 * Parte de StoreConnector necesaria para la Fase 0 (verificación).
 * Los conectores completos (Fase 1+) reutilizan estas funciones.
 */
export interface StoreProbe {
  id: StoreId;
  checkCoverage(ctx: DeliveryContext, env: ProbeEnv): Promise<Coverage>;
  getDeliveryTerms(ctx: DeliveryContext, env: ProbeEnv): Promise<DeliveryTerms>;
}

export function unknownTerms(storeId: StoreId, cp: string, checkedAt: string, notes: string): DeliveryTerms {
  return {
    storeId,
    cp,
    baseCost: null,
    minOrder: null,
    freeFrom: null,
    slots: [],
    loginToSeePrices: null,
    source: 'none',
    checkedAt,
    notes,
  };
}

/** "8,20€" / "7,00 €" / "6,95€" → 8.2 / 7 / 6.95 */
export function parseEuro(text: string): number | null {
  const m = text.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|EUR)/i);
  if (!m) return null;
  return Number(m[1]!.replace(',', '.'));
}

/** Normaliza para comparar nombres de población: minúsculas, sin acentos ni signos. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
