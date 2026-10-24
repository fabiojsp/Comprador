'use client';

import { useEffect, useMemo, useState } from 'react';
import { UNIT_LABEL, type FamilyProfile, type ListItem, type StoreId, type StoreTotal } from '@cesta/core';
import { computeResult, fetchStores, runCompare, type CompareResult, type Pins, type Progress } from '@/lib/compare';
import { STORE_LOGO, type StoreStatus } from '@/lib/stores';
import { dateLabel, euro, qtyLabel } from './ui';
import { ShortcutAction } from './ShortcutAction';

function StoreLogo({ id, name, size = 'md' }: { id: StoreId; name: string; size?: 'md' | 'lg' }) {
  const src = STORE_LOGO[id];
  const box = size === 'lg' ? 'h-12 w-24' : 'h-10 w-16';
  if (!src) return null;
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center rounded-lg bg-white p-1.5 ring-1 ring-line`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} className="max-h-full max-w-full object-contain" loading="lazy" />
    </span>
  );
}

const STATUS_TEXT: Record<string, string> = {
  delivers: 'Reparte en tu zona',
  pickup_only: 'Solo recogida',
  no_delivery: 'No reparte en tu CP',
  unknown: 'Sin dato',
};

function StoreRow({ s, queries }: { s: StoreStatus; queries: string[] }) {
  const t = s.terms;
  let line: string;
  if (s.access === 'cloud') {
    line = s.coverage ? STATUS_TEXT[s.coverage.status] ?? 'Sin dato' : 'Comprobando…';
    if (t && s.coverage?.status === 'delivers') {
      line += ` · envío ${t.baseCost === null ? 'sin dato' : euro(t.baseCost)}`;
      if (t.minOrder) line += ` · mínimo ${euro(t.minOrder)}`;
    }
  } else line = s.note ?? '';
  const ok = s.access === 'cloud' && s.coverage?.status === 'delivers';
  return (
    <li className="flex items-start gap-3 py-2.5">
      <StoreLogo id={s.storeId} name={s.name} />
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium">
          <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-olive' : 'bg-line'}`} />
          {s.name} {s.role === 'extra' && <span className="text-xs font-normal text-muted">· extra</span>}
        </p>
        <p className="text-sm text-muted">{line}</p>
        {s.access === 'shortcut' && <ShortcutAction storeId={s.storeId} name={s.name} queries={queries} />}
      </div>
    </li>
  );
}

function Ticket({ total, name, highlight, onOpen, open }: { total: StoreTotal; name: string; highlight: boolean; onOpen: () => void; open: boolean }) {
  const logo = <StoreLogo id={total.storeId} name={name} size="lg" />;
  const found = total.missing.length;
  return (
    <button type="button" onClick={onOpen} aria-expanded={open} className="block w-full text-left">
      <div className={`ticket-edge bg-card px-5 pb-7 pt-5 shadow-sm ${highlight ? 'ring-2 ring-olive' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {logo}
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.15em]">{name}</p>
          </div>
          {highlight && <span className="rounded-full bg-olive-soft px-2 py-0.5 text-xs font-semibold text-olive">Más barata</span>}
        </div>
        <dl className="tabular mt-4 space-y-1 font-mono text-sm">
          <div className="flex justify-between"><dt>Productos</dt><dd>{found ? `${found} sin encontrar` : 'todos'}</dd></div>
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{euro(total.subtotal)}</dd></div>
          <div className="flex justify-between">
            <dt>Envío</dt>
            <dd>{total.shipping.cost === null ? 'sin dato' : total.shipping.free ? 'gratis' : euro(total.shipping.cost)}</dd>
          </div>
          <div className="my-2 border-t border-dashed border-line" />
          <div className="flex justify-between text-lg font-semibold">
            <dt>TOTAL</dt>
            <dd>{total.total === null ? 'sin dato' : euro(total.total)}</dd>
          </div>
        </dl>
        {total.belowMinimumBy !== null && total.belowMinimumBy > 0 && (
          <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">Te faltan {euro(total.belowMinimumBy)} para el pedido mínimo.</p>
        )}
        {found > 0 && total.penalty > 0 && (
          <p className="mt-2 text-xs text-muted">Para comparar se suma {euro(total.penalty)}: lo que costarían los que faltan en otras tiendas.</p>
        )}
        <p className="mt-3 text-xs font-semibold text-clay">{open ? 'Ocultar productos' : 'Ver productos'}</p>
      </div>
    </button>
  );
}

function ProductLines({
  result,
  storeId,
  items,
  onPin,
}: {
  result: CompareResult;
  storeId: StoreId;
  items: ListItem[];
  onPin: (itemId: string, ref: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const m = result.matches[storeId] ?? {};
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
      {items.map((it) => {
        const r = m[it.id];
        const b = r?.best;
        return (
          <li key={it.id} className="px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted">{it.name} · {qtyLabel(it.qty, it.unit)}</p>
                {b ? (
                  <p className="mt-0.5 leading-snug">
                    {b.units > 1 && <span className="font-mono">{b.units} × </span>}
                    {b.offer.url ? (
                      <a href={b.offer.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-4">{b.offer.name}</a>
                    ) : (
                      b.offer.name
                    )}
                  </p>
                ) : (
                  <p className="mt-0.5 text-clay">No encontrado</p>
                )}
                {b && (
                  <p className="tabular mt-0.5 font-mono text-xs text-muted">
                    {b.offer.formatText ?? ''} · {euro(b.unitPrice)}/{UNIT_LABEL[it.unit]}
                    {b.offer.promo ? ` · ${b.offer.promo.label}` : ''}
                  </p>
                )}
                {(r?.confidence === 'low' || r?.reason) && (
                  <p className="mt-1 text-xs text-warn">{r.reason ?? 'Revisa si es el producto que quieres'}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular font-mono">{b ? euro(b.cost) : '—'}</p>
                {r && r.alternatives.length > 1 && (
                  <button type="button" onClick={() => setOpen(open === it.id ? null : it.id)} className="mt-1 text-xs font-semibold text-clay">
                    Cambiar
                  </button>
                )}
              </div>
            </div>
            {open === it.id && r && (
              <ul className="mt-2 space-y-1 rounded-xl bg-paper p-2">
                {r.alternatives.map((a) => (
                  <li key={a.offer.ref}>
                    <button
                      type="button"
                      onClick={() => {
                        onPin(it.id, a.offer.ref);
                        setOpen(null);
                      }}
                      className={`flex w-full justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm ${a.offer.ref === b?.offer.ref ? 'bg-olive-soft' : ''}`}
                    >
                      <span className="min-w-0">{a.units > 1 ? `${a.units} × ` : ''}{a.offer.name}</span>
                      <span className="tabular shrink-0 font-mono">{euro(a.cost)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function listText(result: CompareResult, storeId: StoreId, items: ListItem[], storeName: string): string {
  const m = result.matches[storeId] ?? {};
  const lines = items
    .map((it) => m[it.id]?.best)
    .filter((b) => !!b)
    .map((b) => `• ${b!.units} × ${b!.offer.name} — ${euro(b!.cost)}${b!.offer.url ? `\n  ${b!.offer.url}` : ''}`);
  const t = result.recommendation.singles.find((s) => s.storeId === storeId);
  return [`Compra en ${storeName}`, ...lines, t?.total != null ? `TOTAL con envío: ${euro(t.total)}` : ''].join('\n');
}

export function CompareView({
  profile,
  items,
  pins,
  setPins,
  result,
  setResult,
}: {
  profile: FamilyProfile;
  items: ListItem[];
  pins: Pins;
  setPins: (p: Pins) => void;
  result: CompareResult | null;
  setResult: (r: CompareResult | null) => void;
}) {
  const [stores, setStores] = useState<StoreStatus[] | null>(null);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openStore, setOpenStore] = useState<StoreId | null>(null);
  const [copied, setCopied] = useState(false);
  const cp = profile.address.cp;
  const active = items.filter((i) => i.checked);
  const stale = result && (result.cp !== cp || result.itemIds.join() !== active.map((i) => i.id).join());

  useEffect(() => {
    let alive = true;
    setStores(null);
    fetchStores(cp)
      .then((s) => alive && setStores(s))
      .catch((e: Error) => alive && setStoresError(e.message));
    return () => {
      alive = false;
    };
  }, [cp]);

  async function start() {
    setBusy(true);
    setError(null);
    setOpenStore(null);
    try {
      const r = await runCompare(profile, active, pins, setProgress);
      setResult(r);
      setOpenStore(r.recommendation.single?.storeId ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function pin(storeId: StoreId, itemId: string, ref: string) {
    if (!result) return;
    const next: Pins = { ...pins, [storeId]: { ...(pins[storeId] ?? {}), [itemId]: ref } };
    setPins(next);
    setResult(computeResult(result, active, profile, next));
  }

  const nameOf = useMemo(() => Object.fromEntries((result?.stores ?? stores ?? []).map((s) => [s.storeId, s.name])), [result, stores]);
  const rec = result?.recommendation;
  const singles = rec ? [...rec.singles].sort((a, b) => (a.comparable ?? Infinity) - (b.comparable ?? Infinity)) : [];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-lg font-semibold">Tiendas para {cp}</h2>
        {storesError && <p className="text-sm text-clay">{storesError}</p>}
        <ul className="divide-y divide-line">{(stores ?? []).map((s) => <StoreRow key={s.storeId} s={s} queries={[...new Set(active.map((i) => i.query))]} />)}</ul>
        {!stores && !storesError && <p className="text-sm text-muted">Comprobando tiendas…</p>}
      </section>

      <section>
        <button
          type="button"
          onClick={start}
          disabled={busy || active.length === 0}
          className="w-full rounded-2xl bg-clay px-4 py-4 text-lg font-semibold text-clay-ink disabled:opacity-50"
        >
          {busy ? 'Comparando…' : `Comparar ${active.length} productos`}
        </button>
        {progress && (
          <div className="mt-3" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-olive transition-[width]" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            </div>
            <p className="tabular mt-1 font-mono text-xs text-muted">
              {progress.store}: {progress.done}/{progress.total} · vamos a ritmo humano para no saturar la tienda
            </p>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-clay">{error}</p>}
        {stale && !busy && <p className="mt-3 text-sm text-warn">Has cambiado la lista o el CP desde la última comparación: vuelve a comparar.</p>}
      </section>

      {result && rec && (
        <section className="space-y-4">
          <p className="font-mono text-xs text-muted">Precios consultados el {dateLabel(result.at)}</p>
          {rec.pair && rec.pairSaving !== null && (
            <div className="rounded-2xl bg-olive-soft p-4 text-olive">
              <p className="font-semibold">
                Combinando {nameOf[rec.pair.stores[0]]} y {nameOf[rec.pair.stores[1]]} ahorras {euro(rec.pairSaving)}
              </p>
              <p className="tabular font-mono text-sm">Total con los dos envíos: {euro(rec.pair.total ?? 0)}</p>
            </div>
          )}
          {singles.length === 1 && <p className="text-sm text-muted">De momento solo se compara Mercadona. Carrefour y Eroski llegan con el atajo del iPhone.</p>}
          {singles.map((t) => (
            <div key={t.storeId} className="space-y-3">
              <Ticket
                total={t}
                name={nameOf[t.storeId] ?? t.storeId}
                highlight={singles.length > 1 && rec.single?.storeId === t.storeId}
                open={openStore === t.storeId}
                onOpen={() => setOpenStore(openStore === t.storeId ? null : t.storeId)}
              />
              {openStore === t.storeId && (
                <>
                  <ProductLines result={result} storeId={t.storeId} items={active} onPin={(itemId, ref) => pin(t.storeId, itemId, ref)} />
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(listText(result, t.storeId, active, nameOf[t.storeId] ?? t.storeId)).catch(() => undefined);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full rounded-xl border border-ink px-4 py-3 font-semibold"
                  >
                    {copied ? 'Lista copiada' : 'Copiar lista con enlaces'}
                  </button>
                </>
              )}
            </div>
          ))}
          {rec.warnings.length > 0 && (
            <ul className="space-y-1 text-sm text-warn">
              {rec.warnings.map((w) => <li key={w}>{w.replace(/^(\w+):/, (_, id: string) => `${nameOf[id] ?? id}:`)}</li>)}
            </ul>
          )}
          {result.errors.length > 0 && (
            <details className="text-sm text-muted">
              <summary>{result.errors.length} búsquedas fallaron</summary>
              <ul className="mt-2 list-disc pl-5">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
