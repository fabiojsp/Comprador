import type { ShortcutStoreId } from '@cesta/connectors/shortcut';

/** Plan guardado en el servidor al pulsar «Leer precios». */
export interface StoredPlan {
  token: string;
  store: ShortcutStoreId;
  queries: string[];
  createdAt: string;
}

/** Resumen de una captura recibida. */
export interface CaptureSummary {
  token: string;
  store: ShortcutStoreId;
  receivedAt: string;
  pages: number;
  ok: number;
  blocked: number;
  ms: number;
}

export const PLAN_TTL_MS = 2 * 3600_000;

export function newToken(): string {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return 'at_' + Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
