import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeLegacyPhotoPath, resolveLegacyPhotoFilePath } from '@/lib/uploads';

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

export async function GET(request: Request, { params }: { params: { measurementId: string } }) {
  const measurement = await prisma.measurement.findUnique({
    where: { id: params.measurementId },
    select: { photoData: true, photoMimeType: true, photoPath: true }
  });

  if (!measurement) {
    return NextResponse.json({ error: 'Medição não encontrada.' }, { status: 404 });
  }

  if (measurement.photoData && measurement.photoMimeType) {
    return new NextResponse(measurement.photoData, {
      status: 200,
      headers: {
        'Content-Type': measurement.photoMimeType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  }

  const legacyPhotoPath = normalizeLegacyPhotoPath(measurement.photoPath);
  if (!legacyPhotoPath) {
    return NextResponse.json({ error: 'Nenhuma foto disponível para esta medição.' }, { status: 404 });
  }

  if (/^https?:\/\//i.test(legacyPhotoPath) || legacyPhotoPath.startsWith('data:')) {
    return NextResponse.redirect(new URL(legacyPhotoPath, request.url));
  }

  const legacyPhotoFilePath = resolveLegacyPhotoFilePath(measurement.photoPath);
  if (!legacyPhotoFilePath) {
    return NextResponse.json({ error: 'Caminho da foto legado é inválido.' }, { status: 404 });
  }

  try {
    const fileBuffer = await fs.readFile(legacyPhotoFilePath);
    const mimeType = MIME_TYPE_BY_EXTENSION[extname(legacyPhotoFilePath).toLowerCase()] ?? 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return NextResponse.json({ error: 'A foto legada não foi encontrada neste ambiente.' }, { status: 404 });
  }
}
