// Almacén clave-valor: Netlify Blobs en producción; memoria en local y en tests.
// Solo guarda planes y capturas del atajo (búsquedas y páginas de tiendas), sin datos personales.
import { getStore } from '@netlify/blobs';

interface Kv {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

const memory = new Map<string, string>();
const memoryKv: Kv = {
  async get<T>(key: string) {
    const v = memory.get(key);
    return v ? (JSON.parse(v) as T) : null;
  },
  async set(key, value) {
    memory.set(key, JSON.stringify(value));
  },
};

function blobsKv(): Kv {
  const store = getStore({ name: 'atajo', consistency: 'strong' });
  return {
    async get<T>(key: string) {
      return ((await store.get(key, { type: 'json' })) as T | null) ?? null;
    },
    async set(key, value) {
      await store.setJSON(key, value);
    },
  };
}

/** En Netlify existe NETLIFY / SITE_ID; fuera, memoria. */
export function kv(): Kv {
  return process.env.NETLIFY || process.env.SITE_ID ? blobsKv() : memoryKv;
}
