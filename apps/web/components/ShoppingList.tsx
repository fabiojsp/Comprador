'use client';

import { useState } from 'react';
import { CATEGORY_ORDER, parseFormat, type ListItem, type Unit } from '@cesta/core';
import { qtyLabel } from './ui';

const STEP: Record<Unit, number> = { kg: 0.1, l: 0.5, ud: 1 };

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/** Crea un artículo libre a partir de lo que escribe el usuario ("Cola Cao 760 g"). */
export function freeItem(text: string): ListItem {
  const t = text.trim();
  const f = parseFormat(t);
  const query = t.replace(/\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?(kg|g|gr|l|cl|ml|ud|uds)\b/gi, '').replace(/\s+/g, ' ').trim() || t;
  return {
    id: `libre-${Date.now().toString(36)}`,
    defId: null,
    name: t,
    category: 'Otros',
    query,
    qty: f ? f.size.qty : 1,
    unit: f ? f.size.unit : 'ud',
    checked: true,
  };
}

export function ShoppingList({
  items,
  onChange,
  onRegenerate,
}: {
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  onRegenerate: () => void;
}) {
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const update = (id: string, patch: Partial<ListItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const groups = [...CATEGORY_ORDER, 'Otros' as const]
    .map((c) => ({ c, list: items.filter((i) => i.category === c) }))
    .filter((g) => g.list.length);
  const checked = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (adding.trim().length < 2) return;
          onChange([freeItem(adding), ...items]);
          setAdding('');
        }}
        className="flex gap-2"
      >
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="Añadir: «Cola Cao 760 g», «tomate frito»…"
          aria-label="Añadir producto"
          className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-3"
        />
        <button className="rounded-xl bg-ink px-4 font-semibold text-paper">Añadir</button>
      </form>

      <p className="font-mono text-xs text-muted">
        {checked} de {items.length} productos marcados · los de reposición salen sin marcar
      </p>

      {groups.map(({ c, list }) => (
        <section key={c}>
          <h2 className="mb-1 font-mono text-xs uppercase tracking-[0.15em] text-muted">{c}</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
            {list.map((it) => (
              <li key={it.id} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={it.checked}
                    onChange={(e) => update(it.id, { checked: e.target.checked })}
                    aria-label={`Comprar ${it.name}`}
                    className="h-5 w-5 accent-[var(--color-clay)]"
                  />
                  <button type="button" onClick={() => setEditing(editing === it.id ? null : it.id)} className={`min-w-0 flex-1 text-left ${it.checked ? '' : 'text-muted'}`}>
                    <span className="block truncate">{it.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {it.brand ? `Marca: ${it.brand}` : it.restock ? 'Reposición' : ' '}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Menos" onClick={() => update(it.id, { qty: Math.max(STEP[it.unit], round(it.qty - STEP[it.unit])) })} className="h-8 w-8 rounded-lg border border-line">−</button>
                    <span className="tabular w-16 text-center font-mono text-sm">{qtyLabel(it.qty, it.unit)}</span>
                    <button type="button" aria-label="Más" onClick={() => update(it.id, { qty: round(it.qty + STEP[it.unit]) })} className="h-8 w-8 rounded-lg border border-line">+</button>
                  </div>
                </div>
                {editing === it.id && (
                  <div className="mt-3 flex items-center gap-2 pl-8">
                    <input
                      defaultValue={it.brand ?? ''}
                      placeholder="Marca concreta (opcional)"
                      aria-label="Marca concreta"
                      onBlur={(e) => update(it.id, { brand: e.target.value.trim() || undefined })}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
                    />
                    <button type="button" onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="text-sm text-clay">
                      Quitar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <button
        type="button"
        onClick={() => {
          if (confirm('¿Rehacer la lista desde el perfil? Se perderán tus cambios.')) onRegenerate();
        }}
        className="w-full rounded-xl border border-line px-4 py-3 text-sm text-muted"
      >
        Rehacer la lista desde el perfil
      </button>
    </div>
  );
}
