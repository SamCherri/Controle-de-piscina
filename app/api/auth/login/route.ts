import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { loginSchema } from '@/lib/validators';

const INVALID_LOGIN_ERROR = 'E-mail ou senha inválidos.';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 400 });
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: INVALID_LOGIN_ERROR }, { status: 401 });
  }

  await createSession(user.id, user.email, user.name);
  return NextResponse.json({ ok: true });
}
