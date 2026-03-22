import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { clearSession, getSession } from '@/lib/session';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });

  console.info('[auth] admin lookup result', {
    email: normalizedEmail,
    foundUser: Boolean(user)
  });

  if (!user) {
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);

  console.info('[auth] password verification result', {
    email: normalizedEmail,
    passwordMatches: valid
  });

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
