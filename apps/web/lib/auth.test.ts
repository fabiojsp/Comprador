import { beforeAll, describe, expect, it } from 'vitest';
import { issueToken, passwordMatches, verifyToken } from './auth';

beforeAll(() => {
  process.env.APP_SESSION_SECRET = 'x'.repeat(48);
  process.env.APP_PASSWORD = 'clave-de-prueba';
});

describe('acceso a la app', () => {
  it('token válido', async () => {
    expect(await verifyToken(await issueToken())).toBe(true);
  });

  it('token caducado', async () => {
    const t = await issueToken(Date.now() - 200 * 24 * 3600 * 1000);
    expect(await verifyToken(t)).toBe(false);
  });

  it('token manipulado (fecha cambiada)', async () => {
    const [, sig] = (await issueToken()).split('.');
    expect(await verifyToken(`${Date.now() + 9e12}.${sig}`)).toBe(false);
  });

  it('sin token o basura', async () => {
    expect(await verifyToken(undefined)).toBe(false);
    expect(await verifyToken('abc')).toBe(false);
  });

  it('contraseña', () => {
    expect(passwordMatches('clave-de-prueba')).toBe(true);
    expect(passwordMatches('otra')).toBe(false);
  });

  it('sin APP_PASSWORD configurada nadie entra', () => {
    const prev = process.env.APP_PASSWORD;
    delete process.env.APP_PASSWORD;
    expect(passwordMatches('')).toBe(false);
    process.env.APP_PASSWORD = prev;
  });
});
