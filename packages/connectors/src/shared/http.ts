import { sleep } from './pace.js';
import { USER_AGENT } from './browser.js';

export interface HttpResult {
  status: number;
  headers: Headers;
  text: string;
}

/** fetch con timeout y reintentos (backoff exponencial) solo ante errores de red o 5xx. */
export async function httpRequest(
  url: string,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
): Promise<HttpResult> {
  const { timeoutMs = 20_000, retries = 2, ...rest } = init;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...rest,
        headers: { 'user-agent': USER_AGENT, 'accept-language': 'es-ES,es;q=0.9', ...(rest.headers ?? {}) },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      if (res.status >= 500 && attempt < retries) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return { status: res.status, headers: res.headers, text };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
