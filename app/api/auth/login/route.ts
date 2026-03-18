import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { loginSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  }

  await createSession(user.id, user.email, user.name);
  return NextResponse.json({ ok: true });
}
