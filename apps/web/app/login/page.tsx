'use client';

import { useState } from 'react';

const LOGOS = [
  ['mercadona', 'Mercadona'],
  ['carrefour', 'Carrefour'],
  ['eroski', 'Eroski'],
  ['alcampo', 'Alcampo'],
  ['hipercentro', 'Hiper Centro'],
] as const;

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
    setBusy(false);
    if (res.ok) window.location.href = '/';
    else setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'No se pudo entrar.');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Cesta · Mallorca</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">Tu compra, con el envío incluido.</h1>
      <ul className="mt-6 grid grid-cols-5 gap-2" aria-label="Supermercados que compara">
        {LOGOS.map(([id, name]) => (
          <li key={id} className="flex h-12 items-center justify-center rounded-lg bg-white p-1.5 ring-1 ring-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/logos/${id}.png`} alt={name} className="max-h-full max-w-full object-contain" />
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <label htmlFor="pw" className="block text-sm text-muted">Contraseña de la app</label>
        <input
          id="pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-lg"
        />
        {error && <p role="alert" className="text-sm text-clay">{error}</p>}
        <button disabled={busy || !password} className="w-full rounded-xl bg-clay px-4 py-3 text-lg font-semibold text-clay-ink disabled:opacity-50">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
