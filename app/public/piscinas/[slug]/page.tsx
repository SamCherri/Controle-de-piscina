import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BackButton } from '@/components/back-button';
import { StatusBadge } from '@/components/status-badge';
import { prisma } from '@/lib/db';
import { getStatusSummaryMessage } from '@/lib/status';

function formatResidentDate(date: Date) {
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function formatValue(value: number, unit?: string) {
  return unit ? `${value.toFixed(1)} ${unit}` : value.toFixed(1);
}

export default async function PublicPoolPage({ params }: { params: { slug: string } }) {
  const pool = await prisma.pool.findUnique({
    where: { slug: params.slug },
    include: {
      condominium: true,
      measurements: {
        orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          measuredAt: true,
          responsibleName: true,
          chlorine: true,
          ph: true,
          alkalinity: true,
          hardness: true,
          temperature: true,
          observations: true,
          overallStatus: true
        }
      }
    }
  });

  if (!pool) notFound();

  const latestMeasurement = pool.measurements[0];
  const hasCoverPhoto = Boolean(pool.coverPhotoData && pool.coverPhotoMimeType);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:py-10">
      <section className="mx-auto mb-4 flex w-full max-w-3xl justify-between gap-2">
        <BackButton fallbackHref="/" label="Voltar" />
        <Link href={`/public/piscinas/${pool.slug}`} className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          Atualizar
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
        <header className="space-y-3 border-b border-slate-100 px-5 pb-5 pt-5 md:px-8 md:pt-7">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-700">Relatório público</p>
          <h1 className="text-2xl font-semibold leading-tight md:text-3xl">{pool.condominium.name}</h1>
          <p className="text-sm text-slate-600 md:text-base">{pool.name}</p>
          {latestMeasurement ? (
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={latestMeasurement.overallStatus} />
              <p className="text-sm text-slate-600">{getStatusSummaryMessage(latestMeasurement.overallStatus)}</p>
            </div>
          ) : null}
        </header>

        <div className="space-y-6 px-5 py-5 md:px-8 md:py-7">
          {hasCoverPhoto ? (
            <Image
              src={`/api/pools/${pool.id}/cover-photo`}
              alt={`Foto da piscina ${pool.name}`}
              width={1200}
              height={800}
              className="h-64 w-full rounded-2xl bg-slate-100 object-cover md:h-80"
              priority
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center md:h-80">
              <p className="max-w-xs text-sm text-slate-500">Foto da piscina ainda não cadastrada. Solicite ao responsável do condomínio para adicionar a imagem pública.</p>
            </div>
          )}

          {latestMeasurement ? (
            <>
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Última medição</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatResidentDate(latestMeasurement.measuredAt)}</p>
                  <p className="text-sm text-slate-500">{formatDistanceToNowStrict(latestMeasurement.measuredAt, { locale: ptBR, addSuffix: true })}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Responsável</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{latestMeasurement.responsibleName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <ParameterCard label="Cloro" value={formatValue(latestMeasurement.chlorine, 'ppm')} />
                <ParameterCard label="pH" value={formatValue(latestMeasurement.ph)} />
                <ParameterCard label="Alcalinidade" value={formatValue(latestMeasurement.alkalinity, 'ppm')} />
                <ParameterCard label="Dureza" value={formatValue(latestMeasurement.hardness, 'ppm')} />
                {pool.tracksTemperature ? (
                  <ParameterCard
                    label="Temperatura"
                    value={
                      typeof latestMeasurement.temperature === 'number'
                        ? formatValue(latestMeasurement.temperature, '°C')
                        : 'Sem leitura'
                    }
                  />
                ) : null}
              </div>

              {latestMeasurement.observations ? (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Observações da última leitura</p>
                  <p className="mt-2 text-sm text-slate-700">{latestMeasurement.observations}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Histórico recente</p>
                <div className="mt-3 space-y-2">
                  {pool.measurements.slice(0, 5).map(item => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <div>
                        <p className="text-sm text-slate-700">{formatResidentDate(item.measuredAt)}</p>
                        <p className="text-xs text-slate-500">Responsável: {item.responsibleName}</p>
                      </div>
                      <StatusBadge status={item.overallStatus} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Ainda não foi registrada nenhuma medição para esta piscina.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ParameterCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </article>
  );
}
