import 'server-only';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { ensureDefaultAdminUser } from '@/lib/default-admin';
import { clearSession, getSession } from '@/lib/session';
import { createAuthAuditLog } from '@/lib/auth/audit';
import { performLoginAttempt } from '@/lib/auth/service';
import { normalizeEmail } from '@/lib/auth/utils';
import type { AuthRequestMetadata } from '@/lib/auth/utils';

export async function authenticateUser(email: string, password: string, request?: AuthRequestMetadata) {
  await ensureDefaultAdminUser();

  const normalizedEmail = normalizeEmail(email);

  return performLoginAttempt(
    {
      findUserByEmail: async normalized =>
        prisma.adminUser.findUnique({
          where: { email: normalized },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            mustChangePassword: true,
            failedLoginAttempts: true,
            lockedUntil: true
          }
        }),
      verifyPassword,
      updateUser: async (userId, data) => {
        await prisma.adminUser.update({
          where: { id: userId },
          data
        });
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
      now: () => new Date()
    },
    normalizedEmail,
    password
  );
}

export async function changePassword(userId: string, newPasswordHash: string, request?: AuthRequestMetadata) {
  const user = await prisma.adminUser.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });

  await createAuthAuditLog({
    userId: user.id,
    email: user.email,
    action: 'password_changed',
    success: true,
    request
  });

  return user;
}


export async function requireAdminSession() {
  const user = await requireSession();
  if (user.role !== 'admin') {
    redirect('/');
  }

  return user;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await prisma.adminUser.findUnique({ where: { id: session.userId } });
  if (!user) {
    clearSession();
    redirect('/login');
  }

  return user;
}

export async function requireApiSession() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const user = await prisma.adminUser.findUnique({ where: { id: session.userId } });
  if (!user) {
    clearSession();
    return null;
  }

  return user;
}
