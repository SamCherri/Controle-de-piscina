import { prisma } from '@/lib/db';
import { normalizeMimeType } from '@/lib/uploads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildPhotoHeaders(photoData: Uint8Array, photoMimeType: string) {
  return {
    'Content-Type': photoMimeType,
    'Content-Length': String(photoData.byteLength),
    'Content-Disposition': 'inline',
    'Cache-Control': 'public, no-store, no-cache, max-age=0, must-revalidate, no-transform',
    'X-Content-Type-Options': 'nosniff'
  };
}

function buildJsonErrorResponse(message: string, status: number) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'public, no-store, no-cache, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}

export async function GET(_request: Request, { params }: { params: { poolId: string } }) {
  const pool = await prisma.pool.findUnique({
    where: { id: params.poolId },
    select: { coverPhotoData: true, coverPhotoMimeType: true }
  });

  if (!pool) {
    return buildJsonErrorResponse('Piscina não encontrada.', 404);
  }

  const normalizedMimeType = normalizeMimeType(pool.coverPhotoMimeType);
  if (!pool.coverPhotoData || pool.coverPhotoData.length === 0 || !normalizedMimeType) {
    return buildJsonErrorResponse('Foto fixa da piscina não encontrada.', 404);
  }

  const photoData = new Uint8Array(pool.coverPhotoData);
  return new Response(Buffer.from(photoData), {
    status: 200,
    headers: buildPhotoHeaders(photoData, normalizedMimeType)
  });
}
