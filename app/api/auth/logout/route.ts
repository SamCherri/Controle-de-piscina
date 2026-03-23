import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth';
import { createAuthAuditLog } from '@/lib/auth/audit';
import { clearSession } from '@/lib/session';
import { getRequestMetadataFromHeaders } from '@/lib/auth/utils';

export async function POST(request: Request) {
  const requestMetadata = getRequestMetadataFromHeaders(request.headers);
  const user = await requireApiSession();

  if (user) {
    await createAuthAuditLog({
      userId: user.id,
      email: user.email,
      action: 'logout',
      success: true,
      request: requestMetadata
    });
  }

  clearSession();
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
