import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveMeasurementPhotoDelivery } from '@/lib/measurement-photo-persistence';
import { toPrismaBytes } from '@/lib/uploads';

export async function GET(_request: Request, { params }: { params: { measurementId: string } }) {
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

  const legacyPhoto = await resolveMeasurementPhotoDelivery(measurement.photoPath);
  if (legacyPhoto.kind === 'embedded') {
    if (legacyPhoto.shouldPersistToDatabase) {
      await prisma.measurement.update({
        where: { id: params.measurementId },
        data: {
          photoData: toPrismaBytes(legacyPhoto.photoData),
          photoMimeType: legacyPhoto.photoMimeType,
          photoPath: null
        }
      });
    }

    return new NextResponse(new Uint8Array(legacyPhoto.photoData), {
      status: 200,
      headers: {
        'Content-Type': legacyPhoto.photoMimeType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  }

  if (legacyPhoto.kind === 'redirect') {
    return NextResponse.redirect(legacyPhoto.location);
  }

  return NextResponse.json({ error: legacyPhoto.error }, { status: 404 });
}
