import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth';
import { unauthorizedJsonResponse } from '@/lib/session';
import { prepareImageUpload } from '@/lib/uploads';

export async function POST(request: Request) {
  const user = await requireApiSession();
  if (!user) {
    return unauthorizedJsonResponse();
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const upload = await prepareImageUpload(file);

  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: 400 });
  }

  if (!upload.buffer || !upload.mimeType) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  return NextResponse.json(
    {
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      size: upload.buffer.length,
      message: 'Upload validado com sucesso. O salvamento definitivo ocorre ao concluir a medição.'
    },
    { status: 200 }
  );
}
