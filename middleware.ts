import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/public') || pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/icons') || pathname.startsWith('/manifest') || pathname === '/sw.js') {
    return NextResponse.next();
  }

  const token = request.cookies.get('pool_admin_session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\.).*)']
};
