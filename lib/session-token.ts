import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import { isProduction } from '@/lib/auth/config';

export type SessionPayload = JWTPayload & {
  userId: string;
  email: string;
  name: string;
  mustChangePassword: boolean;
};

export function getAuthSecret() {
  const authSecret = process.env.AUTH_SECRET;

  if (authSecret) {
    return new TextEncoder().encode(authSecret);
  }

  if (isProduction()) {
    throw new Error('AUTH_SECRET must be configured in production.');
  }

  return new TextEncoder().encode('dev-secret-not-for-production');
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const result = await jwtVerify(token, getAuthSecret());
    return result.payload as SessionPayload;
  } catch {
    return null;
  }
}
