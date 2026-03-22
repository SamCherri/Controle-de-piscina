import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { ensureDefaultAdminUser } from '@/lib/default-admin';
import { clearSession, getSession } from '@/lib/session';

export async function authenticateUser(email: string, password: string) {
  await ensureDefaultAdminUser();

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return null;
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
