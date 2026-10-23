// Acceso con una contraseña sencilla (APP_PASSWORD). La cookie lleva una firma HMAC
// con APP_SESSION_SECRET; funciona en el runtime edge del middleware (Web Crypto).

export const COOKIE = 'cesta_acceso';
const MAX_AGE_DAYS = 180;
export const COOKIE_MAX_AGE = MAX_AGE_DAYS * 24 * 3600;

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function secret(): string {
  const s = process.env.APP_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('APP_SESSION_SECRET no configurado (mínimo 32 caracteres)');
  return s;
}

export async function issueToken(now = Date.now()): Promise<string> {
  const exp = String(now + COOKIE_MAX_AGE * 1000);
  return `${exp}.${await hmac(secret(), exp)}`;
}

export async function verifyToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < now) return false;
  const expected = await hmac(secret(), exp);
  return timingSafeEqual(sig, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}
