import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_PATH_PREFIXES = ['/login', '/public', '/_next', '/icons', '/manifest'];
const PUBLIC_EXACT_PATHS = new Set(['/sw.js']);
const PUBLIC_API_PATHS = new Set(['/api/auth/login']);
const PROTECTED_API_PREFIXES = ['/api/measurements', '/api/uploads'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix)) ||
    PUBLIC_EXACT_PATHS.has(pathname) ||
    PUBLIC_API_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  const requiresSession = pathname.startsWith('/api/')
    ? PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix)) || pathname.startsWith('/api/auth/logout')
    : true;

  if (!requiresSession) {
    return NextResponse.next();
  }

  const token = request.cookies.get('pool_admin_session')?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\.).*)']
};
