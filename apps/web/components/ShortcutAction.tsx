'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StoreId } from '@cesta/core';
import { readLocal, writeLocal } from '@/lib/storage';
import { SHORTCUT_READY_KEY } from './ShortcutGuide';

const PENDING_KEY = 'cesta.atajo.pendiente.v1';

interface Pending {
  token: string;
  startedAt: string;
}

interface Summary {
  receivedAt: string;
  ok: number;
  blocked: number;
  pages: number;
}

type Pendings = Partial<Record<StoreId, Pending>>;

/** Botón «Leer precios» para tiendas que se leen con el atajo del iPhone (Carrefour, Eroski). */
export function ShortcutAction({ storeId, name, queries }: { storeId: StoreId; name: string; queries: string[] }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPending(readLocal<Pendings>(PENDING_KEY, {})[storeId] ?? null);
  }, [storeId]);

  const check = useCallback(async () => {
    if (!pending) return;
    const r = await fetch(`/api/atajo/resultado?t=${encodeURIComponent(pending.token)}`).then((x) => x.json()).catch(() => null);
    if (r?.received) setSummary(r.summary as Summary);
  }, [pending]);

  // Al volver a la app desde Safari (y cada pocos segundos mientras se espera), mira si ya llegó.
  useEffect(() => {
    if (!pending || summary) return;
    check();
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(check, 4000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(id);
    };
  }, [pending, summary, check]);

  async function start() {
    if (!readLocal(SHORTCUT_READY_KEY, false)) {
      window.location.href = '/atajo';
      return;
    }
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch('/api/atajo/sesion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ store: storeId, queries }),
      });
      const j = (await res.json()) as { token?: string; url?: string; error?: string };
      if (!res.ok || !j.token || !j.url) throw new Error(j.error ?? 'No se pudo preparar el atajo');
      const p = { token: j.token, startedAt: new Date().toISOString() };
      writeLocal(PENDING_KEY, { ...readLocal<Pendings>(PENDING_KEY, {}), [storeId]: p });
      setPending(p);
      // En la app de pantalla de inicio, _blank abre Safari, donde está la hoja de compartir con el atajo.
      window.open(j.url, '_blank');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-1">
      {summary ? (
        <p className="text-sm text-olive">
          {summary.blocked > 0 && summary.ok === 0
            ? `${name} mostró una comprobación de seguridad: vuelve a intentarlo cuando cargue la tienda.`
            : `Recibidas ${summary.ok} búsquedas de ${name}. Estoy preparando la lectura de sus precios: aparecerán aquí en la próxima versión.`}
        </p>
      ) : pending ? (
        <p className="text-sm text-muted">Esperando el atajo… En Safari pulsa Compartir → «Cesta precios» y vuelve aquí.</p>
      ) : null}
      {error && <p className="text-sm text-clay">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={start} disabled={busy || queries.length === 0} className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper disabled:opacity-50">
          {busy ? 'Preparando…' : pending ? 'Leer precios otra vez' : 'Leer precios'}
        </button>
        <a href="/atajo" className="px-2 py-2 text-sm text-muted underline underline-offset-4">Cómo configurar el atajo</a>
      </div>
    </div>
  );
}
