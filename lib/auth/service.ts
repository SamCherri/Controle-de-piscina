import type { Prisma } from '@prisma/client';
import { MAX_FAILED_LOGIN_ATTEMPTS, LOGIN_LOCK_MINUTES } from '@/lib/auth/config';

export type AuthUserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

export type AuthServiceDeps = {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
  updateUser(userId: string, data: Partial<Pick<AuthUserRecord, 'failedLoginAttempts' | 'lockedUntil' | 'mustChangePassword'>> & { lastLoginAt?: Date | null; passwordHash?: string }): Promise<void>;
  audit(entry: { userId?: string | null; email: string; action: string; success: boolean; metadata?: Prisma.InputJsonValue }): Promise<void>;
  now(): Date;
};

export type LoginResult =
  | { ok: true; user: Pick<AuthUserRecord, 'id' | 'email' | 'name' | 'mustChangePassword'>; requiresPasswordChange: boolean }
  | { ok: false; error: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED'; lockedUntil?: Date };

export async function performLoginAttempt(
  deps: AuthServiceDeps,
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await deps.findUserByEmail(email);

  if (!user) {
    await deps.audit({
      email,
      action: 'login',
      success: false,
      metadata: { reason: 'user_not_found' }
    });

    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }

  const now = deps.now();

  if (user.lockedUntil && user.lockedUntil > now) {
    await deps.audit({
      userId: user.id,
      email: user.email,
      action: 'login',
      success: false,
      metadata: { reason: 'account_locked', lockedUntil: user.lockedUntil.toISOString() }
    });

    return { ok: false, error: 'ACCOUNT_LOCKED', lockedUntil: user.lockedUntil };
  }

  const valid = await deps.verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const shouldLock = failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60_000) : null;

    await deps.updateUser(user.id, {
      failedLoginAttempts: shouldLock ? 0 : failedLoginAttempts,
      lockedUntil
    });

    await deps.audit({
      userId: user.id,
      email: user.email,
      action: 'login',
      success: false,
      metadata: {
        reason: shouldLock ? 'too_many_attempts' : 'invalid_password',
        failedLoginAttempts,
        lockedUntil: lockedUntil?.toISOString() ?? null
      }
    });

    return shouldLock
      ? { ok: false, error: 'ACCOUNT_LOCKED', lockedUntil: lockedUntil ?? undefined }
      : { ok: false, error: 'INVALID_CREDENTIALS' };
  }

  await deps.updateUser(user.id, {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: now
  });

  await deps.audit({
    userId: user.id,
    email: user.email,
    action: 'login',
    success: true,
    metadata: { mustChangePassword: user.mustChangePassword }
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mustChangePassword: user.mustChangePassword
    },
    requiresPasswordChange: user.mustChangePassword
  };
}
