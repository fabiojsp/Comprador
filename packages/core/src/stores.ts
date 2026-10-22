import type { StoreId, StoreKind, WorkerAffinity } from './types.js';

export interface StoreInfo {
  id: StoreId;
  name: string;
  url: string;
  kind: StoreKind;
  /** Activa por defecto en la app. */
  active: boolean;
  requiresLogin: boolean;
  /** Dónde se ejecuta el conector. Decidido con los datos de docs/TIENDAS.md. */
  affinity: WorkerAffinity;
  notes: string;
}

// Fuente: docs/TIENDAS.md (verificación de la Fase 0). Si cambia la verificación, cambia esto.
export const STORES: Record<StoreId, StoreInfo> = {
  mercadona: {
    id: 'mercadona',
    name: 'Mercadona',
    url: 'https://tienda.mercadona.es',
    kind: 'online_alimentacion',
    active: true,
    requiresLogin: false,
    affinity: 'cloud',
    notes: 'Cobertura y precios por almacén según CP. Búsqueda pública sin login.',
  },
  carrefour: {
    id: 'carrefour',
    name: 'Carrefour',
    url: 'https://www.carrefour.es/supermercado',
    kind: 'online_alimentacion',
    active: true,
    requiresLogin: false,
    affinity: 'home',
    notes: 'Cloudflare bloquea IPs de centro de datos (403). Pendiente de verificar desde el Mac.',
  },
  alcampo: {
    id: 'alcampo',
    name: 'Alcampo',
    url: 'https://www.compraonline.alcampo.es',
    kind: 'online_alimentacion',
    active: true,
    requiresLogin: false,
    affinity: 'cloud',
    notes: 'La cobertura se resuelve por dirección geocodificada, no solo por CP. Domicilio y recogida.',
  },
  eroski: {
    id: 'eroski',
    name: 'Eroski',
    url: 'https://supermercado.eroski.es',
    kind: 'online_alimentacion',
    active: true,
    requiresLogin: false,
    affinity: 'home',
    notes: 'Comprobación reCAPTCHA del navegador desde IP de centro de datos. Pendiente de verificar desde el Mac.',
  },
  eci: {
    id: 'eci',
    name: 'El Corte Inglés / Hipercor',
    url: 'https://www.elcorteingles.es/supermercado/',
    kind: 'online_alimentacion',
    active: true,
    requiresLogin: false,
    affinity: 'home',
    notes: 'Akamai devuelve "Access Denied" a IPs de centro de datos. Pendiente de verificar desde el Mac.',
  },
  hipercentro: {
    id: 'hipercentro',
    name: 'Hiper Centro (TuHiper)',
    url: 'https://tuhiper.com',
    kind: 'online_alimentacion',
    active: true,
    requiresLogin: false,
    affinity: 'cloud',
    notes: 'Cadena balear (Hiper Manacor S.L.). Cobertura por población, no por CP. Login con móvil + PIN.',
  },
  lidl: {
    id: 'lidl',
    name: 'Lidl',
    url: 'https://www.lidl.es',
    kind: 'solo_bazar',
    active: false,
    requiresLogin: false,
    affinity: 'cloud',
    notes: 'La tienda online no vende alimentación. Solo folleto como referencia.',
  },
  aldi: {
    id: 'aldi',
    name: 'Aldi',
    url: 'https://www.aldi.es',
    kind: 'sin_online',
    active: false,
    requiresLogin: false,
    affinity: 'cloud',
    notes: 'Sin compra online. Folleto por región (Baleares) como referencia.',
  },
};

export const STORE_IDS = Object.keys(STORES) as StoreId[];
