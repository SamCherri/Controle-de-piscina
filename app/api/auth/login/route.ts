import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { loginSchema } from '@/lib/validators';
import { getRequestMetadataFromHeaders } from '@/lib/auth/utils';

const INVALID_LOGIN_ERROR = 'E-mail ou senha inválidos.';
const ACCOUNT_LOCKED_ERROR = 'Muitas tentativas inválidas. Tente novamente mais tarde.';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 400 });
  }

  const authResult = await authenticateUser(
    parsed.data.email,
    parsed.data.password,
    getRequestMetadataFromHeaders(request.headers)
  );

  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error === 'ACCOUNT_LOCKED' ? ACCOUNT_LOCKED_ERROR : INVALID_LOGIN_ERROR },
      { status: 401 }
    );
  }

  await createSession({
    userId: authResult.user.id,
    email: authResult.user.email,
    name: authResult.user.name,
    mustChangePassword: authResult.requiresPasswordChange
  });

  return NextResponse.json({ ok: true, mustChangePassword: authResult.requiresPasswordChange });
}
