import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth';
import { persistValidatedImageUpload, UploadValidationError } from '@/lib/upload';

export async function POST(request: Request) {
  const user = await requireApiSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  try {
    const uploaded = await persistValidatedImageUpload(file);
    return NextResponse.json(
      {
        path: uploaded.path,
        mimeType: uploaded.mimeType,
        size: uploaded.size
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
