// Tipos del dominio compartidos por la web y los conectores.
// Regla de oro: ningún precio, envío o cobertura sin `source` y fecha.

export type StoreId =
  | 'mercadona'
  | 'carrefour'
  | 'alcampo'
  | 'eroski'
  | 'eci'
  | 'hipercentro'
  | 'lidl'
  | 'aldi';

export type StoreKind = 'online_alimentacion' | 'solo_bazar' | 'sin_online';

/** Origen de un dato. `none` = no se pudo obtener ("sin dato"). */
export type DataSource = 'live' | 'official_doc' | 'none';

/** Protección detectada que impide leer la web. Nunca se intenta saltar. */
export type BlockKind = 'cloudflare' | 'akamai' | 'recaptcha' | 'aws_waf' | 'network' | 'http_error';

export type CoverageStatus =
  | 'delivers' // ✅ reparte a domicilio
  | 'pickup_only' // ⚠️ solo recogida
  | 'no_delivery' // ❌ no reparte
  | 'bazaar_only' // 🛍️ vende online pero no alimentación
  | 'no_online' // sin tienda online
  | 'unknown'; // sin dato (ver `reason`)

export interface Coverage {
  storeId: StoreId;
  cp: string;
  status: CoverageStatus;
  /** También ofrece recogida en tienda (si se sabe). */
  pickup?: boolean;
  source: DataSource;
  /** ISO 8601. Momento del intento, haya ido bien o mal. */
  checkedAt: string;
  /** Prueba legible: respuesta de la API, texto de la web, URL... */
  evidence: string;
  blockedBy?: BlockKind;
  /** Por qué es `unknown`. */
  reason?: string;
  /** Datos propios de la tienda (almacén, región, id de población...). */
  storeRef?: Record<string, string>;
}

export interface Money {
  /** Euros con IVA. */
  amount: number;
  currency: 'EUR';
}

export interface DeliverySlot {
  label: string; // "mañana", "tarde", "sábado"...
  from?: string; // HH:mm
  to?: string; // HH:mm
  cost?: number;
}

export interface DeliveryTerms {
  storeId: StoreId;
  cp: string;
  /** Coste base del envío, `null` = sin dato. */
  baseCost: number | null;
  /** Pedido mínimo, `null` = sin dato, 0 = sin mínimo. */
  minOrder: number | null;
  /** Envío gratis desde este subtotal, `null` = no hay o sin dato. */
  freeFrom: number | null;
  slots: DeliverySlot[];
  /** Requiere cuenta para ver precios. */
  loginToSeePrices: boolean | null;
  source: DataSource;
  sourceUrl?: string;
  checkedAt: string;
  notes?: string;
}

export type Unit = 'kg' | 'l' | 'ud';

export interface PromoInfo {
  kind: '2x1' | '3x2' | 'second_unit_pct' | 'direct_discount' | 'reduced_price' | 'other';
  label: string;
  /** Porcentaje de la 2ª unidad, unidades que obliga a comprar, etc. */
  params?: Record<string, number>;
}

export interface ProductOffer {
  storeId: StoreId;
  /** Referencia del producto en la tienda. */
  ref: string;
  name: string;
  brand: string | null;
  isStoreBrand: boolean | null;
  /** Texto de formato tal cual lo da la tienda ("pack 6 x 1 L"). */
  formatText: string | null;
  /** Precio por unidad de venta (lo que se paga al añadir 1). */
  price: number;
  /** Precio de referencia de la tienda (€/kg, €/L, €/ud), si lo da. */
  storeUnitPrice: number | null;
  storeUnit: Unit | null;
  promo: PromoInfo | null;
  available: boolean;
  category: string[];
  url: string | null;
  imageUrl: string | null;
  fetchedAt: string;
}

export interface SearchOptions {
  limit?: number;
}

/** Contexto de entrega para una tienda: CP y, si existe, la dirección del perfil. */
export interface DeliveryContext {
  cp: string;
  address?: string;
  town?: string;
}

/** Versión simple: sin login ni carrito automático (ver SPEC.md). */
export interface StoreConnector {
  id: StoreId;
  checkCoverage(ctx: DeliveryContext): Promise<Coverage>;
  getDeliveryTerms(ctx: DeliveryContext): Promise<DeliveryTerms>;
  search(ctx: DeliveryContext, query: string, opts?: SearchOptions): Promise<ProductOffer[]>;
}
