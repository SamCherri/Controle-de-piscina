import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { COOKIE_NAME, decodeSessionToken, getSessionCookieOptions, signSessionToken } from '@/lib/session';

export async function createSession(userId: string, email: string, name: string) {
  const token = await signSessionToken({ userId, email, name });

  cookies().set(COOKIE_NAME, token, getSessionCookieOptions());
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return decodeSessionToken(token);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: session.userId }
  });

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

  const user = await prisma.adminUser.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true }
  });

  if (!user) {
    clearSession();
    return null;
  }

  return user;
}
