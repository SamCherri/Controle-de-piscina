import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeLegacyPhotoPath } from '@/lib/uploads';

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
  if (legacyPhotoPath) {
    return NextResponse.redirect(new URL(legacyPhotoPath, request.url));
  }

  return NextResponse.json({ error: 'Nenhuma foto disponível para esta medição.' }, { status: 404 });
}
