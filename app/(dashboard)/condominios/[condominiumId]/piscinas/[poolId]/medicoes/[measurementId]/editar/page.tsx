import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { MeasurementForm } from '@/components/forms/measurement-form';

export default async function EditMeasurementPage({ params }: { params: { condominiumId: string; poolId: string; measurementId: string } }) {
  const measurement = await prisma.measurement.findUnique({
    where: { id: params.measurementId },
    include: { pool: true }
  });

  if (!measurement || measurement.poolId !== params.poolId || measurement.pool.condominiumId !== params.condominiumId) notFound();

  const measuredAt = new Date(measurement.measuredAt.getTime() - measurement.measuredAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <>
      <PageHeader title={`Editar medição - ${measurement.pool.name}`} description="Ajuste parâmetros, produtos, observações e substitua a foto quando necessário." />
      <MeasurementForm
        poolId={measurement.poolId}
        defaults={{
          id: measurement.id,
          measuredAt,
          responsibleName: measurement.responsibleName,
          chlorine: measurement.chlorine,
          ph: measurement.ph,
          alkalinity: measurement.alkalinity,
          hardness: measurement.hardness,
          temperature: measurement.temperature,
          productsApplied: measurement.productsApplied,
          observations: measurement.observations,
          photoPath: measurement.photoPath
        }}
      />
    </>
  );
}
