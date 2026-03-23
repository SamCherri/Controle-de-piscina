import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/config';
import { signSessionToken, type SessionPayload, verifySessionToken } from '@/lib/session-token';

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type { SessionPayload };

export async function createSession(session: SessionPayload) {
  const token = await signSessionToken(session);

  cookies().set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export function clearSession() {
  cookies().set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0)
  });
}

export async function getSession() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

export function unauthorizedJsonResponse() {
  return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
}
