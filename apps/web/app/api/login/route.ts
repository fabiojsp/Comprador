import { NextResponse } from 'next/server';
import { COOKIE, COOKIE_MAX_AGE, issueToken, passwordMatches } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  // Pequeña espera fija para frenar intentos repetidos.
  await new Promise((r) => setTimeout(r, 400));
  if (!password || !passwordMatches(password)) {
    return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await issueToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
