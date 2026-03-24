import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { PoolForm } from '@/components/forms/pool-form';

export default async function EditPoolPage({ params }: { params: { condominiumId: string; poolId: string } }) {
  const pool = await prisma.pool.findUnique({
    where: { id: params.poolId },
    include: { condominium: true }
  });

  if (!pool || pool.condominiumId !== params.condominiumId) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={`Editar piscina: ${pool.name}`}
        description="Atualize identificação, observações e faixas ideais para cálculo automático de status."
      />
      <PoolForm
        mode="edit"
        condominiumId={pool.condominiumId}
        initialValues={{
          id: pool.id,
          condominiumId: pool.condominiumId,
          name: pool.name,
          description: pool.description,
          locationNote: pool.locationNote,
          idealChlorineMin: pool.idealChlorineMin,
          idealChlorineMax: pool.idealChlorineMax,
          idealPhMin: pool.idealPhMin,
          idealPhMax: pool.idealPhMax,
          idealAlkalinityMin: pool.idealAlkalinityMin,
          idealAlkalinityMax: pool.idealAlkalinityMax,
          idealHardnessMin: pool.idealHardnessMin,
          idealHardnessMax: pool.idealHardnessMax,
          idealTemperatureMin: pool.idealTemperatureMin,
          idealTemperatureMax: pool.idealTemperatureMax
        }}
      />
    </>
  );
}
