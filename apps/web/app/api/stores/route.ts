import { NextResponse } from 'next/server';
import { isValidCp } from '@cesta/core';
import { mercadonaProbe } from '@cesta/connectors/mercadona';
import { cached, HOUR } from '@/lib/cache';
import { APP_STORES, type StoreStatus } from '@/lib/stores';

export const runtime = 'nodejs';

const env = { browser: () => Promise.reject(new Error('Sin navegador en este endpoint')), now: () => new Date() };

/** Estado de cada tienda para un CP: cobertura y condiciones de envío (con fuente y fecha). */
export async function POST(req: Request) {
  const { cp } = (await req.json().catch(() => ({}))) as { cp?: string };
  if (!cp || !isValidCp(cp)) return NextResponse.json({ error: 'Código postal no válido (debe ser de Baleares, 07xxx).' }, { status: 400 });

  const stores: StoreStatus[] = await Promise.all(
    APP_STORES.map(async (s) => {
      const base = { storeId: s.id, name: s.name, role: s.role, access: s.access, note: s.note, coverage: null, terms: null };
      if (s.id !== 'mercadona') return base;
      const [coverage, terms] = await Promise.all([
        cached(`cov:mercadona:${cp}`, 12 * HOUR, () => mercadonaProbe.checkCoverage({ cp }, env)),
        cached('terms:mercadona', 12 * HOUR, () => mercadonaProbe.getDeliveryTerms({ cp }, env)),
      ]);
      return { ...base, coverage, terms };
    }),
  );
  return NextResponse.json({ stores });
}
