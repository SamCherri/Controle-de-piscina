import 'server-only';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { PASSWORD_RESET_TOKEN_BYTES } from '@/lib/auth/config';

export type AuthRequestMetadata = {
  ip: string | null;
  userAgent: string | null;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRandomToken() {
  return crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
}

export function getRequestMetadataFromHeaders(headersLike: Headers): AuthRequestMetadata {
  const forwardedFor = headersLike.get('x-forwarded-for');
  const realIp = headersLike.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp?.trim() || null;

  return {
    ip,
    userAgent: headersLike.get('user-agent')
  };
}

export function getCurrentRequestMetadata(): AuthRequestMetadata {
  return getRequestMetadataFromHeaders(headers());
}
