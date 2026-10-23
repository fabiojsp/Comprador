'use client';

import type { ReactNode } from 'react';

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-right text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm ${on ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink'}`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-line bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-2 py-2 text-sm ${value === o.value ? 'bg-ink font-semibold text-paper' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const euroFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const euro = (n: number) => euroFmt.format(n);

export function qtyLabel(qty: number, unit: 'kg' | 'l' | 'ud'): string {
  if (unit === 'ud') return `${qty} ud`;
  if (unit === 'kg' && qty < 1) return `${Math.round(qty * 1000)} g`;
  if (unit === 'l' && qty < 1) return `${Math.round(qty * 1000)} ml`;
  return `${qty.toString().replace('.', ',')} ${unit === 'l' ? 'L' : 'kg'}`;
}

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
