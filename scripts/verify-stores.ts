/**
 * Fase 0 — Verificación de tiendas.
 *
 *   npm run verify-stores                      → los 3 CP de prueba, todas las tiendas
 *   npm run verify-stores -- --cp 07360        → un CP
 *   npm run verify-stores -- --store mercadona → una tienda
 *   npm run verify-stores -- --label "Mac casa" → etiqueta la red desde la que se ejecuta
 *
 * Escribe docs/verificacion/<red>.json y regenera el bloque automático de docs/TIENDAS.md.
 * Nunca resuelve CAPTCHAs ni esquiva protecciones: si una web bloquea, queda "sin dato".
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { STORES, STORE_IDS, type Coverage, type DeliveryContext, type DeliveryTerms, type StoreId } from '@cesta/core';
import { PROBES, launchBrowser, type ProbeEnv } from '@cesta/connectors';
import type { Browser } from 'playwright';

/** CP de prueba de la Fase 0. `town` hace falta para tiendas que reparten por población. */
const TEST_LOCATIONS: DeliveryContext[] = [
  { cp: '07009', town: 'Palma' },
  { cp: '07300', town: 'Inca' },
  { cp: '07360', town: 'Lloseta' }, // CP del perfil
];

const { values } = parseArgs({
  options: {
    cp: { type: 'string', multiple: true },
    town: { type: 'string' },
    store: { type: 'string', multiple: true },
    label: { type: 'string', default: 'nube' },
    'no-doc': { type: 'boolean', default: false },
  },
});

const locations: DeliveryContext[] = values.cp
  ? values.cp.map((cp) => TEST_LOCATIONS.find((l) => l.cp === cp) ?? { cp, town: values.town })
  : TEST_LOCATIONS;
const storeIds = (values.store as StoreId[] | undefined) ?? STORE_IDS;
const label = values.label!;

interface StoreResult {
  storeId: StoreId;
  coverage: Coverage[];
  terms: DeliveryTerms | null;
}

let browser: Browser | null = null;
const env: ProbeEnv = {
  browser: async () => (browser ??= await launchBrowser()),
  now: () => new Date(),
};

async function safe<T>(fn: () => Promise<T>, fallback: (err: unknown) => T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    return fallback(err);
  }
}

async function verifyStore(id: StoreId): Promise<StoreResult> {
  const probe = PROBES[id];
  const coverage: Coverage[] = [];
  for (const loc of locations) {
    const c = await safe(
      () => probe.checkCoverage(loc, env),
      (err): Coverage => ({
        storeId: id, cp: loc.cp, status: 'unknown', source: 'none', checkedAt: env.now().toISOString(),
        evidence: String(err).slice(0, 200), reason: 'Error del sondeo (posible cambio en la web)',
      }),
    );
    coverage.push(c);
    console.log(`  ${id.padEnd(12)} ${loc.cp}  ${c.status.padEnd(12)} ${c.reason ?? c.evidence}`);
  }
  // Las condiciones de envío son las mismas para los CP de prueba en todas las tiendas
  // verificadas; se leen con el CP del perfil (el último).
  const covered = coverage.find((c) => c.status === 'delivers') ? locations.at(-1)! : null;
  const terms = await safe(
    () => probe.getDeliveryTerms(covered ?? locations.at(-1)!, env),
    () => null,
  );
  if (terms) console.log(`  ${id.padEnd(12)} envío=${terms.baseCost ?? 'sin dato'} mínimo=${terms.minOrder ?? 'sin dato'} (${terms.source})`);
  return { storeId: id, coverage, terms };
}

const ICON: Record<Coverage['status'], string> = {
  delivers: '✅ reparte',
  pickup_only: '⚠️ solo recogida',
  no_delivery: '❌ no reparte',
  bazaar_only: '🛍️ solo bazar',
  no_online: '— sin online',
  unknown: '❔ sin dato',
};

const euro = (n: number | null) => (n === null ? 'sin dato' : n === 0 ? '0 €' : `${n.toFixed(2).replace('.', ',')} €`);

function renderAuto(results: StoreResult[], when: string): string {
  const cps = locations.map((l) => l.cp);
  const lines = [
    `_Generado por \`npm run verify-stores\` desde la red **${label}** el ${when}. No editar a mano este bloque._`,
    '',
    `| Tienda | ${cps.join(' | ')} | Envío base | Pedido mínimo | Fuente envío | Bloqueo detectado |`,
    `|---|${cps.map(() => '---').join('|')}|---|---|---|---|`,
  ];
  for (const r of results) {
    const blocked = [...new Set(r.coverage.map((c) => c.blockedBy).filter(Boolean))].join(', ') || '—';
    const t = r.terms;
    lines.push(
      `| ${STORES[r.storeId].name} | ${r.coverage.map((c) => ICON[c.status]).join(' | ')} | ${euro(t?.baseCost ?? null)} | ${euro(t?.minOrder ?? null)} | ${t?.source ?? 'none'} | ${blocked} |`,
    );
  }
  lines.push('', '<details><summary>Evidencias</summary>', '');
  for (const r of results) {
    for (const c of r.coverage) {
      lines.push(`- **${STORES[r.storeId].name} ${c.cp}** · ${c.status} · ${c.evidence}${c.reason ? ` · _${c.reason}_` : ''}`);
    }
    if (r.terms?.notes) lines.push(`- **${STORES[r.storeId].name} envío** · ${r.terms.notes}${r.terms.sourceUrl ? ` · ${r.terms.sourceUrl}` : ''}`);
  }
  lines.push('', '</details>');
  return lines.join('\n');
}

const INSERT = '<!-- AUTO:INSERT -->';

async function main() {
  console.log(`Verificando ${storeIds.length} tiendas × ${locations.length} CP desde "${label}"…`);
  const results: StoreResult[] = [];
  // Una tienda detrás de otra: nada de paralelismo agresivo.
  for (const id of storeIds) results.push(await verifyStore(id));
  await browser?.close();

  const when = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const slug = label.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await mkdir('docs/verificacion', { recursive: true });
  await writeFile(`docs/verificacion/${slug}.json`, JSON.stringify({ label, when, locations, results }, null, 2) + '\n');

  if (!values['no-doc']) {
    // Un bloque por red (nube, Mac de casa…) para que una ejecución no pise a la otra.
    const START = `<!-- AUTO:${slug}:START -->`;
    const END = `<!-- AUTO:${slug}:END -->`;
    const doc = await readFile('docs/TIENDAS.md', 'utf8');
    const section = `${START}\n### Red: ${label}\n\n${renderAuto(results, when)}\n${END}`;
    const a = doc.indexOf(START);
    const b = doc.indexOf(END);
    let next: string;
    if (a !== -1 && b !== -1) next = doc.slice(0, a) + section + doc.slice(b + END.length);
    else if (doc.includes(INSERT)) next = doc.replace(INSERT, `${section}\n\n${INSERT}`);
    else throw new Error(`docs/TIENDAS.md no tiene el marcador ${INSERT}`);
    await writeFile('docs/TIENDAS.md', next);
  }
  console.log(`Listo: docs/verificacion/${slug}.json`);
}

main().catch(async (err) => {
  console.error(err);
  await browser?.close();
  process.exit(1);
});
