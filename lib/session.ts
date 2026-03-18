import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'pool_admin_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-not-for-production');

export type SessionPayload = { userId: string; email: string; name: string };

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function decodeSessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const result = await jwtVerify(token, secret);
    return result.payload as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS
  };
}
