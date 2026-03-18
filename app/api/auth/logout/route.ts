import { NextResponse } from 'next/server';
import { clearSession, requireApiSession, unauthorizedJsonResponse } from '@/lib/auth';

export async function POST() {
  const user = await requireApiSession();
  if (!user) {
    return unauthorizedJsonResponse();
  }

  clearSession();
  return NextResponse.json({ ok: true });
}
