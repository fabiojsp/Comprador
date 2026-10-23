'use client';

import { useEffect, useState } from 'react';
import { generateBasket, type FamilyProfile, type ListItem } from '@cesta/core';
import { KEYS, useLocal } from '@/lib/storage';
import type { CompareResult, Pins } from '@/lib/compare';
import { EMPTY_PROFILE, ProfileForm } from './ProfileForm';
import { ShoppingList } from './ShoppingList';
import { CompareView } from './CompareView';

type Tab = 'perfil' | 'lista' | 'comparar';

const TABS: { id: Tab; label: string }[] = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'lista', label: 'Lista' },
  { id: 'comparar', label: 'Comparar' },
];

export function App() {
  const [profile, setProfile, ready] = useLocal<FamilyProfile | null>(KEYS.profile, null);
  const [list, setList] = useLocal<ListItem[]>(KEYS.list, []);
  const [pins, setPins] = useLocal<Pins>(KEYS.pins, {});
  const [result, setResult] = useLocal<CompareResult | null>(KEYS.result, null);
  const [tab, setTab] = useState<Tab>('comparar');

  useEffect(() => {
    if (ready && !profile) setTab('perfil');
  }, [ready, profile]);

  if (!ready) return null;

  const title = { perfil: 'Tu familia', lista: 'Lista de la compra', comparar: 'Comparar' }[tab];

  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Cesta{profile ? ` · ${profile.address.town} ${profile.address.cp}` : ' · Mallorca'}
        </p>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </header>

      <main className="px-4 pb-32 pt-5">
        {tab === 'perfil' && (
          <>
            {!profile && (
              <p className="mb-6 text-muted">
                Cuéntame quién come en casa y dónde vives. Con eso preparo tu lista y busco qué supermercados te lo traen y a qué precio.
              </p>
            )}
            <ProfileForm
              initial={profile ?? EMPTY_PROFILE}
              onSave={(p) => {
                const first = !profile || list.length === 0;
                setProfile(p);
                if (first || confirm('¿Rehacer la lista con el perfil nuevo? Si no, se mantiene tu lista actual.')) setList(generateBasket(p));
                setTab('lista');
              }}
            />
          </>
        )}
        {tab === 'lista' && profile && (
          <ShoppingList items={list} onChange={setList} onRegenerate={() => setList(generateBasket(profile))} />
        )}
        {tab === 'comparar' && profile && (
          <CompareView profile={profile} items={list} pins={pins} setPins={setPins} result={result} setResult={setResult} />
        )}
      </main>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-xl grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!profile && t.id !== 'perfil'}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
              className={`py-3 text-sm font-semibold disabled:opacity-30 ${tab === t.id ? 'text-clay' : 'text-muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
