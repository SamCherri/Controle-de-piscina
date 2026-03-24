import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveMeasurementPhotoPersistence } from '@/lib/measurement-photo-persistence';
import { unauthorizedJsonResponse } from '@/lib/session';
import { computeMeasurementStatuses } from '@/lib/status';
import { toPrismaBytes } from '@/lib/uploads';
import { measurementSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const user = await requireApiSession();
  if (!user) {
    return unauthorizedJsonResponse();
  }

  const { searchParams } = new URL(request.url);
  const poolId = searchParams.get('poolId');
  if (!poolId) return NextResponse.json({ error: 'poolId é obrigatório.' }, { status: 400 });

  const measurements = await prisma.measurement.findMany({
    where: { poolId },
    orderBy: { measuredAt: 'desc' }
  });

  return NextResponse.json(measurements);
}

export async function POST(request: Request) {
  const user = await requireApiSession();
  if (!user) {
    return unauthorizedJsonResponse();
  }

  const body = await request.json();
  const parsed = measurementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pool = await prisma.pool.findUnique({ where: { id: parsed.data.poolId } });
  if (!pool) return NextResponse.json({ error: 'Piscina não encontrada.' }, { status: 404 });

  if (pool.tracksTemperature && typeof parsed.data.temperature !== 'number') {
    return NextResponse.json({ error: 'Informe a temperatura para piscinas com monitoramento ativo.' }, { status: 400 });
  }

  const photoPersistence = await resolveMeasurementPhotoPersistence({
    photoPath: parsed.data.photoPath
  });
  if (!photoPersistence.ok) {
    return NextResponse.json({ error: photoPersistence.error }, { status: 400 });
  }

  const statuses = computeMeasurementStatuses(pool, parsed.data);

  const measurement = await prisma.measurement.create({
    data: {
      ...parsed.data,
      temperature: pool.tracksTemperature ? parsed.data.temperature : null,
      measuredAt: new Date(parsed.data.measuredAt),
      photoPath: photoPersistence.kind === 'preserved-legacy' ? photoPersistence.photoPath : null,
      ...(photoPersistence.kind === 'embedded'
        ? {
            photoData: toPrismaBytes(photoPersistence.photoData),
            photoMimeType: photoPersistence.photoMimeType
          }
        : {}),
      ...statuses
    }
  });

  return NextResponse.json(measurement, { status: 201 });
}
