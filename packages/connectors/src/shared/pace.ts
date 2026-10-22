// Ritmo humano: pausas aleatorias y límite de peticiones por minuto por tienda.

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function randomBetween(minMs: number, maxMs: number, rnd: () => number = Math.random): number {
  return Math.round(minMs + (maxMs - minMs) * rnd());
}

export interface PacerOptions {
  /** Máximo de peticiones en una ventana de 60 s. */
  perMinute: number;
  minPauseMs: number;
  maxPauseMs: number;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
  rnd?: () => number;
}

/**
 * Serializa las peticiones a UNA tienda: una cada vez, con pausa aleatoria
 * entre ellas y sin superar `perMinute` en una ventana deslizante.
 */
export class Pacer {
  private stamps: number[] = [];
  private chain: Promise<unknown> = Promise.resolve();
  private readonly o: Required<PacerOptions>;

  constructor(opts: PacerOptions) {
    this.o = { now: Date.now, wait: sleep, rnd: Math.random, ...opts };
  }

  /** Ejecuta `fn` respetando el ritmo. */
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.chain.then(async () => {
      await this.waitTurn();
      return fn();
    });
    this.chain = next.catch(() => undefined);
    return next;
  }

  /** Milisegundos a esperar antes de la siguiente petición (exportado para tests). */
  delayFor(now: number): number {
    const windowStart = now - 60_000;
    this.stamps = this.stamps.filter((s) => s > windowStart);
    const pause = this.stamps.length ? randomBetween(this.o.minPauseMs, this.o.maxPauseMs, this.o.rnd) : 0;
    const last = this.stamps.at(-1);
    let delay = last === undefined ? 0 : Math.max(0, last + pause - now);
    if (this.stamps.length >= this.o.perMinute) {
      const oldest = this.stamps[this.stamps.length - this.o.perMinute]!;
      delay = Math.max(delay, oldest + 60_000 - now);
    }
    return delay;
  }

  private async waitTurn() {
    const delay = this.delayFor(this.o.now());
    if (delay > 0) await this.o.wait(delay);
    this.stamps.push(this.o.now());
  }
}

export const DEFAULT_PACE: Omit<PacerOptions, 'now' | 'wait' | 'rnd'> = {
  perMinute: Number(process.env.STORE_MAX_REQ_PER_MIN ?? 20),
  minPauseMs: 1500,
  maxPauseMs: 4000,
};
