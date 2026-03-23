import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_PATH_PREFIXES = ['/login', '/forgot-password', '/reset-password', '/public', '/_next', '/icons', '/manifest'];
const PUBLIC_EXACT_PATHS = new Set(['/sw.js']);
const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/password-reset', '/api/auth/password-reset/confirm']);
const PROTECTED_API_PREFIXES = ['/api/debug', '/api/measurements', '/api/uploads'];
const PUBLIC_MEASUREMENT_PHOTO_ROUTE = /^\/api\/measurements\/[^/]+\/photo$/;
const FORCE_PASSWORD_CHANGE_PATH = '/trocar-senha-obrigatoria';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix)) ||
    PUBLIC_EXACT_PATHS.has(pathname) ||
    PUBLIC_API_PATHS.has(pathname) ||
    (request.method === 'GET' && PUBLIC_MEASUREMENT_PHOTO_ROUTE.test(pathname))
  ) {
    return NextResponse.next();
  }

  const requiresSession = pathname.startsWith('/api/')
    ? PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix)) || pathname.startsWith('/api/auth/logout')
    : true;

  if (!requiresSession) {
    return NextResponse.next();
  }

  const rawSession = request.cookies.get('pool_admin_session')?.value;
  if (!rawSession) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  const sessionPayload = parseJwtPayload(rawSession);
  const mustChangePassword = sessionPayload?.mustChangePassword === true;

  if (mustChangePassword && !pathname.startsWith(FORCE_PASSWORD_CHANGE_PATH) && !pathname.startsWith('/api/auth/logout')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Troca de senha obrigatória.' }, { status: 403 });
    }

    return NextResponse.redirect(new URL(FORCE_PASSWORD_CHANGE_PATH, request.url));
  }

  if (!mustChangePassword && pathname.startsWith(FORCE_PASSWORD_CHANGE_PATH)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const config = {
  matcher: ['/((?!.*\\.).*)']
};
