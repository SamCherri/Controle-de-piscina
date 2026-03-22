import { prisma } from '@/lib/db';
import { resolveMeasurementPhotoDelivery } from '@/lib/measurement-photo-persistence';
import { toPrismaBytes } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

function buildPhotoResponse(photoData: Uint8Array, photoMimeType: string) {
  return new Response(Buffer.from(photoData), {
    status: 200,
    headers: {
      'Content-Type': photoMimeType,
      'Content-Length': String(photoData.byteLength),
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=31536000, immutable, no-transform',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export async function GET(_request: Request, { params }: { params: { measurementId: string } }) {
  const measurement = await prisma.measurement.findUnique({
    where: { id: params.measurementId },
    select: { id: true, photoData: true, photoMimeType: true, photoPath: true }
  });

  if (!measurement) {
    return Response.json({ error: 'Medição não encontrada.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  if (measurement.photoData && measurement.photoMimeType) {
    return buildPhotoResponse(new Uint8Array(measurement.photoData), measurement.photoMimeType);
  }

  const legacyPhoto = await resolveMeasurementPhotoDelivery(measurement.photoPath);
  if (legacyPhoto.kind === 'embedded') {
    if (legacyPhoto.shouldPersistToDatabase) {
      await prisma.measurement.update({
        where: { id: measurement.id },
        data: {
          photoData: toPrismaBytes(legacyPhoto.photoData),
          photoMimeType: legacyPhoto.photoMimeType,
          photoPath: null
        }
      });
    }

    return buildPhotoResponse(new Uint8Array(legacyPhoto.photoData), legacyPhoto.photoMimeType);
  }

  return Response.json({ error: legacyPhoto.error }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
