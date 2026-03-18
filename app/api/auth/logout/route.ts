import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth';
import { clearSession, unauthorizedJsonResponse } from '@/lib/session';

export async function POST() {
  const user = await requireApiSession();
  if (!user) {
    return unauthorizedJsonResponse();
  }

  clearSession();
  return NextResponse.json({ ok: true });
}
