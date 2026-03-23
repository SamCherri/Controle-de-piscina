import type { Prisma } from '@prisma/client';

export type PasswordResetUser = {
  id: string;
  email: string;
};

export type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  user: PasswordResetUser;
};

export type PasswordResetServiceDeps = {
  findUserByEmail(email: string): Promise<PasswordResetUser | null>;
  invalidateOpenTokens(userId: string, exceptTokenId?: string): Promise<void>;
  createToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  markTokenUsed(tokenId: string): Promise<void>;
  audit(entry: { userId?: string | null; email: string; action: string; success: boolean; metadata?: Prisma.InputJsonValue }): Promise<void>;
  generateToken(): string;
  hashToken(token: string): string;
  now(): Date;
  expiresAt(from: Date): Date;
  buildResetUrl(token: string): string;
  exposeResetUrlPreview: boolean;
};

export async function issuePasswordReset(deps: PasswordResetServiceDeps, email: string) {
  const user = await deps.findUserByEmail(email);

  if (!user) {
    await deps.audit({
      email,
      action: 'password_reset_requested',
      success: true,
      metadata: { userExists: false }
    });

    return { ok: true as const, message: 'Se o e-mail existir, você receberá instruções para redefinir a senha.' };
  }

  await deps.invalidateOpenTokens(user.id);

  const token = deps.generateToken();
  const tokenHash = deps.hashToken(token);
  const expiresAt = deps.expiresAt(deps.now());
  await deps.createToken({ userId: user.id, tokenHash, expiresAt });

  await deps.audit({
    userId: user.id,
    email: user.email,
    action: 'password_reset_requested',
    success: true,
    metadata: { expiresAt: expiresAt.toISOString() }
  });

  return {
    ok: true as const,
    message: 'Se o e-mail existir, você receberá instruções para redefinir a senha.',
    resetUrlPreview: deps.exposeResetUrlPreview ? deps.buildResetUrl(token) : undefined
  };
}

export async function redeemPasswordReset(deps: PasswordResetServiceDeps, token: string, passwordHash: string) {
  const tokenHash = deps.hashToken(token);
  const resetToken = await deps.findTokenByHash(tokenHash);

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= deps.now()) {
    await deps.audit({
      userId: resetToken?.userId,
      email: resetToken?.user.email ?? 'desconhecido',
      action: 'password_reset_completed',
      success: false,
      metadata: { reason: !resetToken ? 'token_not_found' : resetToken.usedAt ? 'token_used' : 'token_expired' }
    });

    return { ok: false as const, error: 'Token inválido ou expirado.' };
  }

  await deps.updateUserPassword(resetToken.userId, passwordHash);
  await deps.markTokenUsed(resetToken.id);
  await deps.invalidateOpenTokens(resetToken.userId, resetToken.id);

  await deps.audit({
    userId: resetToken.userId,
    email: resetToken.user.email,
    action: 'password_reset_completed',
    success: true
  });

  return { ok: true as const, email: resetToken.user.email };
}
