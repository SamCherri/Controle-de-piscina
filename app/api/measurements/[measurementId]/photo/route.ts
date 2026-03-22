import { prisma } from '@/lib/db';
import { resolveMeasurementPhotoDelivery } from '@/lib/measurement-photo-persistence';
import { normalizeMimeType, toPrismaBytes } from '@/lib/uploads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildPhotoHeaders(photoData: Uint8Array, photoMimeType: string) {
  return {
    'Content-Type': photoMimeType,
    'Content-Length': String(photoData.byteLength),
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate, no-transform',
    'X-Content-Type-Options': 'nosniff'
  };
}

function buildPhotoResponse(photoData: Uint8Array, photoMimeType: string) {
  return new Response(Buffer.from(photoData), {
    status: 200,
    headers: buildPhotoHeaders(photoData, photoMimeType)
  });
}

function buildJsonErrorResponse(message: string, status: number) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}

export async function GET(_request: Request, { params }: { params: { measurementId: string } }) {
  const measurement = await prisma.measurement.findUnique({
    where: { id: params.measurementId },
    select: { id: true, photoData: true, photoMimeType: true, photoPath: true }
  });

  if (!measurement) {
    return buildJsonErrorResponse('Medição não encontrada.', 404);
  }

  const normalizedMimeType = normalizeMimeType(measurement.photoMimeType);
  if (measurement.photoData && measurement.photoData.length > 0 && normalizedMimeType) {
    return buildPhotoResponse(new Uint8Array(measurement.photoData), normalizedMimeType);
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

  const inconsistencyMessage = measurement.photoData && measurement.photoData.length > 0 && !normalizedMimeType
    ? 'photoData existe, mas photoMimeType está ausente ou inválido nesta medição.'
    : legacyPhoto.error;

  return buildJsonErrorResponse(inconsistencyMessage, 404);
}
