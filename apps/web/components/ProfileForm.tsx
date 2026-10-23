'use client';

import { useState } from 'react';
import {
  AGE_LABEL,
  RESTRICTION_LABEL,
  consumptionUnits,
  isValidCp,
  type AgeRange,
  type BrandPreference,
  type FamilyProfile,
  type Restriction,
} from '@cesta/core';
import { Chip, Field, Section, Segmented } from './ui';

export const EMPTY_PROFILE: FamilyProfile = {
  members: ['adult', 'adult'],
  address: { street: '', cp: '', town: '' },
  brand: 'any',
  restrictions: [],
  pets: { dog: false, cat: false },
  frequency: 'weekly',
};

const AGES: AgeRange[] = ['adult', '65+', '12-17', '4-11', '0-3'];

export function ProfileForm({ initial, onSave }: { initial: FamilyProfile; onSave: (p: FamilyProfile) => void }) {
  const [p, setP] = useState<FamilyProfile>(initial);
  const [touched, setTouched] = useState(false);
  const cpOk = isValidCp(p.address.cp);
  const valid = p.members.length > 0 && cpOk && p.address.town.trim().length > 1;

  const setMember = (i: number, a: AgeRange) => setP({ ...p, members: p.members.map((m, j) => (j === i ? a : m)) });
  const toggleRestriction = (r: Restriction) =>
    setP({ ...p, restrictions: p.restrictions.includes(r) ? p.restrictions.filter((x) => x !== r) : [...p.restrictions, r] });

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (valid) onSave({ ...p, address: { ...p.address, street: p.address.street.trim(), town: p.address.town.trim() } });
      }}
    >
      <Section title="Quién come en casa" hint={`${consumptionUnits(p.members).toString().replace('.', ',')} unidades de consumo`}>
        <ul className="space-y-2">
          {p.members.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 font-mono text-sm text-muted">{i + 1}</span>
              <select
                aria-label={`Edad de la persona ${i + 1}`}
                value={m}
                onChange={(e) => setMember(i, e.target.value as AgeRange)}
                className="flex-1 rounded-xl border border-line bg-card px-3 py-2.5"
              >
                {AGES.map((a) => (
                  <option key={a} value={a}>{AGE_LABEL[a]}</option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Quitar persona ${i + 1}`}
                disabled={p.members.length === 1}
                onClick={() => setP({ ...p, members: p.members.filter((_, j) => j !== i) })}
                className="h-10 w-10 rounded-xl border border-line text-lg text-muted disabled:opacity-30"
              >
                −
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setP({ ...p, members: [...p.members, 'adult'] })} className="mt-3 text-sm font-semibold text-clay">
          + Añadir persona
        </button>
      </Section>

      <Section title="Dónde te lo traen" hint="Decide qué tiendas reparten">
        <div className="space-y-3">
          <Field label="Calle y número">
            <input value={p.address.street} autoComplete="street-address" onChange={(e) => setP({ ...p, address: { ...p.address, street: e.target.value } })} className="w-full rounded-xl border border-line bg-card px-3 py-2.5" />
          </Field>
          <div className="flex gap-3">
            <Field label="Código postal" className="w-32">
              <input
                inputMode="numeric"
                maxLength={5}
                autoComplete="postal-code"
                value={p.address.cp}
                onChange={(e) => setP({ ...p, address: { ...p.address, cp: e.target.value.replace(/\D/g, '') } })}
                aria-invalid={touched && !cpOk}
                className="w-full rounded-xl border border-line bg-card px-3 py-2.5 font-mono"
              />
            </Field>
            <Field label="Población" className="flex-1">
              <input value={p.address.town} autoComplete="address-level2" onChange={(e) => setP({ ...p, address: { ...p.address, town: e.target.value } })} className="w-full rounded-xl border border-line bg-card px-3 py-2.5" />
            </Field>
          </div>
          {touched && !cpOk && <p className="text-sm text-clay">El código postal tiene que ser de Baleares (07xxx).</p>}
          {touched && cpOk && p.address.town.trim().length < 2 && <p className="text-sm text-clay">Falta la población.</p>}
        </div>
      </Section>

      <Section title="Marcas">
        <Segmented<BrandPreference>
          value={p.brand}
          onChange={(brand) => setP({ ...p, brand })}
          options={[
            { value: 'store', label: 'Marca blanca' },
            { value: 'maker', label: 'De fabricante' },
            { value: 'any', label: 'Me da igual' },
          ]}
        />
      </Section>

      <Section title="Necesidades">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(RESTRICTION_LABEL) as Restriction[]).map((r) => (
            <Chip key={r} on={p.restrictions.includes(r)} onClick={() => toggleRestriction(r)}>{RESTRICTION_LABEL[r]}</Chip>
          ))}
          <Chip on={p.pets.dog} onClick={() => setP({ ...p, pets: { ...p.pets, dog: !p.pets.dog } })}>Perro</Chip>
          <Chip on={p.pets.cat} onClick={() => setP({ ...p, pets: { ...p.pets, cat: !p.pets.cat } })}>Gato</Chip>
        </div>
      </Section>

      <Section title="Cada cuánto compras">
        <Segmented
          value={p.frequency}
          onChange={(frequency) => setP({ ...p, frequency })}
          options={[
            { value: 'weekly', label: 'Cada semana' },
            { value: 'biweekly', label: 'Cada 15 días' },
          ]}
        />
      </Section>

      <button className="w-full rounded-2xl bg-clay px-4 py-4 text-lg font-semibold text-clay-ink">Guardar perfil</button>
    </form>
  );
}
