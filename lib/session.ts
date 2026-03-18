import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'pool_admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
};

function getAuthSecret() {
  const authSecret = process.env.AUTH_SECRET;

  if (authSecret) {
    return new TextEncoder().encode(authSecret);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be configured in production.');
  }

  return new TextEncoder().encode('dev-secret-not-for-production');
}

async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getAuthSecret());
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const result = await jwtVerify(token, getAuthSecret());
    return result.payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, email: string, name: string) {
  const token = await signSessionToken({ userId, email, name });

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

export function unauthorizedJsonResponse() {
  return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
}
