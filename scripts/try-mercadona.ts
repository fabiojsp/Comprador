/**
 * Prueba en vivo: genera la cesta de un perfil y la compara en Mercadona.
 *   npx tsx scripts/try-mercadona.ts [--cp 07360] [--members adult,adult,4-11]
 */
import { parseArgs } from 'node:util';
import { generateBasket, matchItem, recommend, formatEuro, type AgeRange, type FamilyProfile } from '@cesta/core';
import { searchMercadona, warehouseFor } from '../packages/connectors/src/stores/mercadona/search.js';
import { mercadonaProbe } from '../packages/connectors/src/stores/mercadona/probe.js';

const { values } = parseArgs({ options: { cp: { type: 'string', default: '07360' }, members: { type: 'string', default: 'adult,adult' } } });
const profile: FamilyProfile = {
  members: values.members!.split(',') as AgeRange[],
  address: { street: '', cp: values.cp!, town: '' },
  brand: 'any',
  restrictions: [],
  pets: { dog: false, cat: false },
  frequency: 'weekly',
};

const t0 = Date.now();
const wh = await warehouseFor(profile.address.cp);
if (!wh) throw new Error('Mercadona no reparte en ese CP');
const items = generateBasket(profile).filter((i) => i.checked);
const matches: Record<string, ReturnType<typeof matchItem>['best']> = {};
let low = 0;
for (const it of items) {
  const offers = await searchMercadona(wh, it.query);
  const r = matchItem(it, offers, { brand: profile.brand });
  matches[it.id] = r.best;
  if (r.confidence === 'low') low++;
  console.log(
    `${r.best ? (r.confidence === 'high' ? '✅' : '⚠️ ') : '❌'} ${it.name.padEnd(30)} ${String(it.qty).padStart(5)} ${it.unit.padEnd(2)} → ${
      r.best ? `${r.best.units} × ${r.best.offer.name} (${r.best.offer.formatText}) = ${formatEuro(r.best.cost)}` : r.reason
    }`,
  );
}
const terms = await mercadonaProbe.getDeliveryTerms({ cp: profile.address.cp }, { browser: () => Promise.reject(new Error()), now: () => new Date() });
const rec = recommend([{ storeId: 'mercadona', matches, terms }], items.map((i) => i.id));
const s = rec.singles[0]!;
console.log(`\n${items.length} artículos · encontrados ${items.length - s.missing.length} · dudosos ${low}`);
console.log(`Subtotal ${formatEuro(s.subtotal)} + envío ${s.shipping.cost === null ? 'sin dato' : formatEuro(s.shipping.cost)} = ${s.total === null ? 'sin dato' : formatEuro(s.total)}`);
console.log(`Tiempo: ${Math.round((Date.now() - t0) / 1000)} s`);
