import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computeMeasurementStatuses } from '@/lib/status';
import { requireApiSession } from '@/lib/auth';
import { measurementSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const user = await requireApiSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const poolId = searchParams.get('poolId');
  if (!poolId) return NextResponse.json({ error: 'poolId é obrigatório.' }, { status: 400 });

  const measurements = await prisma.measurement.findMany({
    where: { poolId },
    orderBy: { measuredAt: 'desc' }
  });

  return NextResponse.json(measurements, {
    headers: { 'Cache-Control': 'no-store' }
  });
}

export async function POST(request: Request) {
  const user = await requireApiSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = measurementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pool = await prisma.pool.findUnique({ where: { id: parsed.data.poolId } });
  if (!pool) return NextResponse.json({ error: 'Piscina não encontrada.' }, { status: 404 });

  const statuses = computeMeasurementStatuses(pool, parsed.data);

  const measurement = await prisma.measurement.create({
    data: {
      poolId: parsed.data.poolId,
      measuredAt: new Date(parsed.data.measuredAt),
      responsibleName: parsed.data.responsibleName,
      chlorine: parsed.data.chlorine,
      ph: parsed.data.ph,
      alkalinity: parsed.data.alkalinity,
      hardness: parsed.data.hardness,
      temperature: parsed.data.temperature,
      productsApplied: parsed.data.productsApplied,
      observations: parsed.data.observations || null,
      photoPath: parsed.data.photoPath || null,
      ...statuses
    }
  });

  return NextResponse.json(measurement, {
    status: 201,
    headers: { 'Cache-Control': 'no-store' }
  });
}
