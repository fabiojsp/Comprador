import type { StoreId } from '@cesta/core';
import type { StoreProbe } from './shared/probe.js';
import { mercadonaProbe } from './stores/mercadona/probe.js';
import { alcampoProbe } from './stores/alcampo/probe.js';
import { hipercentroProbe } from './stores/hipercentro/probe.js';
import { gatedProbe } from './stores/gated-probe.js';
import { aldiProbe, lidlProbe } from './stores/reference-probes.js';

export * from './shared/probe.js';
export * from './shared/block-detect.js';
export * from './shared/pace.js';
export { launchBrowser } from './shared/browser.js';

export const PROBES: Record<StoreId, StoreProbe> = {
  mercadona: mercadonaProbe,
  carrefour: gatedProbe('carrefour', 'https://www.carrefour.es/supermercado'),
  alcampo: alcampoProbe,
  eroski: gatedProbe('eroski', 'https://supermercado.eroski.es/'),
  eci: gatedProbe('eci', 'https://www.elcorteingles.es/supermercado/'),
  hipercentro: hipercentroProbe,
  lidl: lidlProbe,
  aldi: aldiProbe,
};
