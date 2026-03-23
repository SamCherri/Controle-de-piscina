import { NextResponse } from 'next/server';
import { consumePasswordResetToken } from '@/lib/auth/password-reset';
import { hashPassword } from '@/lib/password';
import { getRequestMetadataFromHeaders } from '@/lib/auth/utils';
import { resetPasswordSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const result = await consumePasswordResetToken(
    parsed.data.token,
    await hashPassword(parsed.data.password),
    getRequestMetadataFromHeaders(request.headers)
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
