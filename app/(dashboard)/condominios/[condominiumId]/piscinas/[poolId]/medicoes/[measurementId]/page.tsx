import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { MeasurementPhoto } from '@/components/measurement-photo';
import { PhotoStorageAlert } from '@/components/photo-storage-alert';
import { getMeasurementPhotoState } from '@/lib/uploads';

export default async function MeasurementDetailsPage({ params }: { params: { condominiumId: string; poolId: string; measurementId: string } }) {
  const measurement = await prisma.measurement.findUnique({
    where: { id: params.measurementId },
    include: {
      pool: {
        include: {
          condominium: true
        }
      }
    }
  });

  if (!measurement || measurement.poolId !== params.poolId || measurement.pool.condominiumId !== params.condominiumId) {
    notFound();
  }

  const photo = getMeasurementPhotoState(measurement);
  const photoSrc = photo.kind === 'missing' ? undefined : photo.src;
  const photoCacheKey = `${measurement.measuredAt.getTime()}-${measurement.updatedAt.getTime()}`;

  return (
    <>
      <PageHeader
        title={`Detalhe da medição • ${measurement.pool.name}`}
        description="Auditoria completa da medição com foto, parâmetros, produtos aplicados, observações e status calculado."
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="card space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Medição registrada</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{format(measurement.measuredAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</h2>
              <p className="mt-2 text-sm text-slate-500">Responsável: {measurement.responsibleName}</p>
            </div>
            <StatusBadge status={measurement.overallStatus} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cloro</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{measurement.chlorine} ppm</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">pH</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{measurement.ph}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Alcalinidade</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{measurement.alkalinity} ppm</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dureza</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{measurement.hardness} ppm</p>
            </div>
            {measurement.pool.tracksTemperature && typeof measurement.temperature === 'number' ? (
              <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Temperatura</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{measurement.temperature} °C</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Produtos aplicados</p>
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{measurement.productsApplied}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Observações</p>
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{measurement.observations || 'Sem observações.'}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/condominios/${measurement.pool.condominiumId}/piscinas/${measurement.pool.id}`}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Voltar para histórico
            </Link>
            <Link
              href={`/condominios/${measurement.pool.condominiumId}/piscinas/${measurement.pool.id}/medicoes/${measurement.id}/editar`}
              className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Editar medição
            </Link>
          </div>
        </article>

        <aside className="card space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Foto da medição</h3>
          <MeasurementPhoto
            src={photoSrc}
            alt={measurement.pool.name}
            width={1100}
            height={780}
            cacheKey={photoCacheKey}
            className="h-auto w-full rounded-2xl object-cover"
            fallbackClassName="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400"
            emptyMessage="Esta medição não possui foto salva."
          />
          {photo.kind !== 'missing' && photo.warning ? <PhotoStorageAlert message={photo.warning} /> : null}
        </aside>
      </section>
    </>
  );
}
