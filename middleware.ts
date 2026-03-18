import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, decodeSessionToken } from '@/lib/session';

const PUBLIC_FILE_PATTERN = /\.[^/]+$/;
const PUBLIC_PATH_PREFIXES = ['/login', '/public', '/_next', '/icons', '/manifest.webmanifest', '/sw.js'];
const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/logout']);
const PROTECTED_API_PREFIXES = ['/api/measurements', '/api/uploads'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isProtectedApiPath(pathname: string) {
  return PROTECTED_API_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_FILE_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname) || PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await decodeSessionToken(token);

  if (!session) {
    if (isProtectedApiPath(pathname)) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\.).*)']
};
