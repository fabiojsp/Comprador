'use client';

import { useCallback, useEffect, useState } from 'react';

// Todo lo del usuario (perfil, lista, productos fijados) vive en el iPhone.
// localStorage puede fallar (modo privado, almacenamiento lleno): se protege cada acceso.

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: la app sigue funcionando en memoria */
  }
}

/** Estado React persistido en el iPhone. `ready` es false hasta leer el almacenamiento. */
export function useLocal<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setValue(readLocal(key, fallback));
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (next: T | ((prev: T) => T)) =>
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        writeLocal(key, v);
        return v;
      }),
    [key],
  );
  return [value, set, ready] as const;
}

export const KEYS = {
  profile: 'cesta.profile.v1',
  list: 'cesta.list.v1',
  pins: 'cesta.pins.v1',
  result: 'cesta.result.v1',
} as const;
