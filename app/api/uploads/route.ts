import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth';
import { unauthorizedJsonResponse } from '@/lib/session';
import { persistImageUpload } from '@/lib/uploads';

export async function POST(request: Request) {
  const user = await requireApiSession();
  if (!user) {
    return unauthorizedJsonResponse();
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const upload = await persistImageUpload(file);

  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: 400 });
  }

  if (!upload.path) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  return NextResponse.json({ path: upload.path }, { status: 201 });
}
