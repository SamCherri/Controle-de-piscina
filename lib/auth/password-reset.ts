import 'server-only';
import { prisma } from '@/lib/db';
import { PASSWORD_RESET_EXPIRY_MINUTES, getPasswordResetBaseUrl, isProduction } from '@/lib/auth/config';
import { createAuthAuditLog } from '@/lib/auth/audit';
import { generateRandomToken, hashToken, normalizeEmail } from '@/lib/auth/utils';
import type { AuthRequestMetadata } from '@/lib/auth/utils';
import { issuePasswordReset, redeemPasswordReset } from '@/lib/auth/password-reset-service';

export async function requestPasswordReset(email: string, request?: AuthRequestMetadata) {
  const normalizedEmail = normalizeEmail(email);

  return issuePasswordReset(
    {
      findUserByEmail: async normalized => prisma.adminUser.findUnique({ where: { email: normalized }, select: { id: true, email: true } }),
      invalidateOpenTokens: async (userId, exceptTokenId) => {
        await prisma.passwordResetToken.updateMany({
          where: {
            userId,
            usedAt: null,
            ...(exceptTokenId ? { id: { not: exceptTokenId } } : {})
          },
          data: { usedAt: new Date() }
        });
      },
      createToken: async input => {
        await prisma.passwordResetToken.create({ data: input });
      },
      findTokenByHash: async tokenHash =>
        prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, email: true } } } }),
      updateUserPassword: async (userId, passwordHash) => {
        await prisma.adminUser.update({
          where: { id: userId },
          data: {
            passwordHash,
            mustChangePassword: false,
            failedLoginAttempts: 0,
            lockedUntil: null
          }
        });
      },
      markTokenUsed: async tokenId => {
        await prisma.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } });
      },
      audit: async entry => {
        await createAuthAuditLog({
          userId: entry.userId,
          email: entry.email,
          action: entry.action,
          success: entry.success,
          metadata: entry.metadata,
          request
        });
      },
      generateToken: generateRandomToken,
      hashToken,
      now: () => new Date(),
      expiresAt: from => new Date(from.getTime() + PASSWORD_RESET_EXPIRY_MINUTES * 60_000),
      buildResetUrl: token => `${getPasswordResetBaseUrl()}/reset-password?token=${token}`,
      exposeResetUrlPreview: !isProduction()
    },
    normalizedEmail
  );
}

export async function consumePasswordResetToken(token: string, nextPasswordHash: string, request?: AuthRequestMetadata) {
  return redeemPasswordReset(
    {
      findUserByEmail: async normalized => prisma.adminUser.findUnique({ where: { email: normalized }, select: { id: true, email: true } }),
      invalidateOpenTokens: async (userId, exceptTokenId) => {
        await prisma.passwordResetToken.updateMany({
          where: {
            userId,
            usedAt: null,
            ...(exceptTokenId ? { id: { not: exceptTokenId } } : {})
          },
          data: { usedAt: new Date() }
        });
      },
      createToken: async input => {
        await prisma.passwordResetToken.create({ data: input });
      },
      findTokenByHash: async tokenHash =>
        prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, email: true } } } }),
      updateUserPassword: async (userId, passwordHash) => {
        await prisma.adminUser.update({
          where: { id: userId },
          data: {
            passwordHash,
            mustChangePassword: false,
            failedLoginAttempts: 0,
            lockedUntil: null
          }
        });
      },
      markTokenUsed: async tokenId => {
        await prisma.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } });
      },
      audit: async entry => {
        await createAuthAuditLog({
          userId: entry.userId,
          email: entry.email,
          action: entry.action,
          success: entry.success,
          metadata: entry.metadata,
          request
        });
      },
      generateToken: generateRandomToken,
      hashToken,
      now: () => new Date(),
      expiresAt: from => new Date(from.getTime() + PASSWORD_RESET_EXPIRY_MINUTES * 60_000),
      buildResetUrl: token => `${getPasswordResetBaseUrl()}/reset-password?token=${token}`,
      exposeResetUrlPreview: !isProduction()
    },
    token,
    nextPasswordHash
  );
}
