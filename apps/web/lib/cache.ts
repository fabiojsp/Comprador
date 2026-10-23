// Caché en memoria de la instancia del servidor (se pierde al reiniciar; no guarda datos personales).
type Entry<T> = { value: T; until: number };
const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.until > Date.now()) return hit.value;
  const value = await fn();
  store.set(key, { value, until: Date.now() + ttlMs });
  if (store.size > 5000) store.delete(store.keys().next().value!);
  return value;
}

export const HOUR = 3600_000;
