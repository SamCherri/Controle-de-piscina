import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireApiSession, unauthorizedJsonResponse } from '@/lib/auth';
import { validateImageUpload } from '@/lib/validators';

export async function POST(request: Request) {
  const user = await requireApiSession();
  if (!user) {
    return unauthorizedJsonResponse();
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const validation = validateImageUpload(file);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${randomUUID()}.${validation.extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  return NextResponse.json({ path: `/uploads/${fileName}` }, { status: 201 });
}
