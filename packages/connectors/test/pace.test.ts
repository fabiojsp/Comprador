import { describe, expect, it } from 'vitest';
import { Pacer } from '../src/shared/pace.js';

function fakeClock() {
  let t = 0;
  const waits: number[] = [];
  return {
    now: () => t,
    wait: async (ms: number) => {
      waits.push(ms);
      t += ms;
    },
    waits,
  };
}

describe('Pacer', () => {
  it('la primera petición sale sin esperar y las siguientes con pausa aleatoria', async () => {
    const c = fakeClock();
    const p = new Pacer({ perMinute: 100, minPauseMs: 1000, maxPauseMs: 3000, now: c.now, wait: c.wait, rnd: () => 0.5 });
    await p.run(async () => 1);
    await p.run(async () => 2);
    expect(c.waits).toEqual([2000]);
  });

  it('no supera el máximo por minuto', async () => {
    const c = fakeClock();
    const p = new Pacer({ perMinute: 3, minPauseMs: 0, maxPauseMs: 0, now: c.now, wait: c.wait, rnd: () => 0 });
    for (let i = 0; i < 4; i++) await p.run(async () => i);
    // La 4ª espera hasta que la 1ª salga de la ventana de 60 s.
    expect(c.waits).toEqual([60_000]);
  });

  it('serializa: nunca dos peticiones a la vez en la misma tienda', async () => {
    const c = fakeClock();
    const p = new Pacer({ perMinute: 100, minPauseMs: 0, maxPauseMs: 0, now: c.now, wait: c.wait });
    let running = 0;
    let maxRunning = 0;
    const job = () =>
      p.run(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
      });
    await Promise.all([job(), job(), job()]);
    expect(maxRunning).toBe(1);
  });

  it('un error no bloquea la cola', async () => {
    const c = fakeClock();
    const p = new Pacer({ perMinute: 100, minPauseMs: 0, maxPauseMs: 0, now: c.now, wait: c.wait });
    await expect(p.run(async () => { throw new Error('x'); })).rejects.toThrow('x');
    await expect(p.run(async () => 'ok')).resolves.toBe('ok');
  });
});
