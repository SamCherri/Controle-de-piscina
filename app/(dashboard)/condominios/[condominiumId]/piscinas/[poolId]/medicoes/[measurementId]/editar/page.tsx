import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { MeasurementForm } from '@/components/forms/measurement-form';
import { MeasurementPhoto } from '@/components/measurement-photo';
import { PhotoStorageAlert } from '@/components/photo-storage-alert';
import { getMeasurementPhotoState } from '@/lib/uploads';

export default async function EditMeasurementPage({ params }: { params: { condominiumId: string; poolId: string; measurementId: string } }) {
  const measurement = await prisma.measurement.findUnique({
    where: { id: params.measurementId },
    include: { pool: true }
  });

  if (!measurement || measurement.poolId !== params.poolId || measurement.pool.condominiumId !== params.condominiumId) notFound();

  const measuredAt = new Date(measurement.measuredAt.getTime() - measurement.measuredAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const photo = getMeasurementPhotoState(measurement);

  return (
    <>
      <PageHeader title={`Editar medição - ${measurement.pool.name}`} description="Ajuste parâmetros, produtos, observações e substitua a foto quando necessário." />
      <div className="mb-6 grid gap-4">
        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Foto atual da medição</h2>
            <p className="mt-1 text-sm text-slate-500">Se esta foto for do armazenamento legado, reenviar o arquivo nesta edição grava a imagem no banco e elimina o risco de ela sumir após deploy/restart.</p>
          </div>
          <MeasurementPhoto
            src={photo.kind === 'missing' ? undefined : photo.src}
            alt={measurement.pool.name}
            width={900}
            height={650}
            className="h-auto w-full rounded-2xl object-cover"
            fallbackClassName="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400"
            emptyMessage="Esta medição não possui foto salva."
          />
          {photo.kind !== 'missing' && photo.warning ? <PhotoStorageAlert message={photo.warning} /> : null}
        </div>
      </div>
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
