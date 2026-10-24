import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verifyToken } from './lib/auth';

const PUBLIC = ['/login', '/api/login', '/manifest.webmanifest', '/icon.svg', '/apple-icon.png', '/icon-192.png', '/icon-512.png'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname) || pathname.startsWith('/logos/')) return NextResponse.next();
  const ok = await verifyToken(req.cookies.get(COOKIE)?.value).catch(() => false);
  if (ok) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Necesitas entrar con la contraseña de la app.' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
