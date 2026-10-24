import type { Coverage, DeliveryTerms, StoreId } from '@cesta/core';

/** Cómo obtiene la app los precios de cada tienda (SPEC §2). */
export type StoreAccess = 'cloud' | 'shortcut' | 'soon';

export interface StoreStatus {
  storeId: StoreId;
  name: string;
  role: 'main' | 'extra';
  access: StoreAccess;
  coverage: Coverage | null;
  terms: DeliveryTerms | null;
  /** Mensaje para el usuario cuando la tienda aún no se puede comparar. */
  note?: string;
}

/** Logos facilitados por el usuario (public/logos). */
export const STORE_LOGO: Partial<Record<StoreId, string>> = {
  mercadona: '/logos/mercadona.png',
  carrefour: '/logos/carrefour.png',
  eroski: '/logos/eroski.png',
  alcampo: '/logos/alcampo.png',
  hipercentro: '/logos/hipercentro.png',
};

export const APP_STORES: { id: StoreId; name: string; role: 'main' | 'extra'; access: StoreAccess; note?: string }[] = [
  { id: 'mercadona', name: 'Mercadona', role: 'main', access: 'cloud' },
  { id: 'carrefour', name: 'Carrefour', role: 'main', access: 'shortcut', note: 'Se lee con el atajo del iPhone, con tu conexión.' },
  { id: 'eroski', name: 'Eroski', role: 'main', access: 'shortcut', note: 'Se lee con el atajo del iPhone, con tu conexión.' },
  { id: 'alcampo', name: 'Alcampo', role: 'extra', access: 'soon', note: 'Tienda extra: llega en la Fase 2.' },
  { id: 'hipercentro', name: 'Hiper Centro', role: 'extra', access: 'soon', note: 'Tienda extra: llega en la Fase 2.' },
];
