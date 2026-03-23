import { NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/auth/password-reset';
import { forgotPasswordSchema } from '@/lib/validators';
import { getRequestMetadataFromHeaders } from '@/lib/auth/utils';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const result = await requestPasswordReset(parsed.data.email, getRequestMetadataFromHeaders(request.headers));
  return NextResponse.json(result);
}
