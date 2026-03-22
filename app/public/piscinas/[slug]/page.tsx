import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { prisma } from '@/lib/db';
import { MetricCard } from '@/components/metric-card';
import { MeasurementPhoto } from '@/components/measurement-photo';
import { StatusBadge } from '@/components/status-badge';
import { statusMeta } from '@/lib/status';
import { getMeasurementPhotoSrc } from '@/lib/uploads';

export default async function PublicPoolPage({ params }: { params: { slug: string } }) {
  const pool = await prisma.pool.findUnique({
    where: { slug: params.slug },
    include: {
      condominium: true,
      measurements: {
        orderBy: { measuredAt: 'desc' },
        take: 1
      }
    }
  });

  if (!pool) notFound();
  const latest = pool.measurements[0];
  if (!latest) notFound();

  const latestPhotoSrc = getMeasurementPhotoSrc(latest);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-700 to-brand-900 shadow-soft">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-brand-100">Painel público da piscina</p>
              <h1 className="mt-3 text-4xl font-semibold">{pool.condominium.name}</h1>
              <p className="mt-2 text-lg text-brand-50">{pool.name}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <StatusBadge status={latest.overallStatus} />
                <span className="text-sm text-brand-50">Última atualização em {format(latest.measuredAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              <p className="mt-4 max-w-2xl text-sm text-brand-50/90">{statusMeta[latest.overallStatus].message}</p>
              <div className="mt-6 rounded-3xl bg-white/10 p-5 backdrop-blur">
                <p className="text-sm font-semibold text-brand-50">Responsável pela medição</p>
                <p className="mt-1 text-xl font-semibold">{latest.responsibleName}</p>
                <p className="mt-4 text-sm text-brand-50/90"><strong>Produtos aplicados:</strong> {latest.productsApplied}</p>
                <p className="mt-3 text-sm text-brand-50/90"><strong>Observações:</strong> {latest.observations || 'Sem observações registradas na última atualização.'}</p>
              </div>
            </div>
            <div>
              <MeasurementPhoto src={latestPhotoSrc} alt={pool.name} width={1000} height={700} className="h-full min-h-[280px] w-full rounded-[28px] object-cover" fallbackClassName="flex min-h-[280px] items-center justify-center rounded-[28px] border border-white/10 bg-white/10 px-6 text-center text-sm text-brand-50/70" />
            </div>
          </div>
        </section>
        <section className="metric-grid">
          <MetricCard label="Cloro atual" value={latest.chlorine} unit="ppm" status={latest.chlorineStatus} range={`${pool.idealChlorineMin} a ${pool.idealChlorineMax} ppm`} />
          <MetricCard label="pH atual" value={latest.ph} unit="" status={latest.phStatus} range={`${pool.idealPhMin} a ${pool.idealPhMax}`} />
          <MetricCard label="Alcalinidade" value={latest.alkalinity} unit="ppm" status={latest.alkalinityStatus} range={`${pool.idealAlkalinityMin} a ${pool.idealAlkalinityMax} ppm`} />
          <MetricCard label="Dureza cálcica" value={latest.hardness} unit="ppm" status={latest.hardnessStatus} range={`${pool.idealHardnessMin} a ${pool.idealHardnessMax} ppm`} />
          <MetricCard label="Temperatura" value={latest.temperature} unit="°C" status={latest.temperatureStatus} range={`${pool.idealTemperatureMin} a ${pool.idealTemperatureMax} °C`} />
        </section>
      </div>
    </main>
  );
}
