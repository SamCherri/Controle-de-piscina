import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import {
  describeFallbackReason,
  describeMeasurementPhotoAvailability,
  selectMeasurementPhotoForDisplay
} from '@/lib/measurement-photo-summary';
import { getMeasurementPhotoState, normalizeLegacyPhotoPath, normalizeMimeType } from '@/lib/uploads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DebugPhotosPageProps = {
  searchParams?: {
    poolId?: string;
  };
};

export default async function DebugPhotosPage({ searchParams }: DebugPhotosPageProps) {
  const poolId = searchParams?.poolId?.trim() || undefined;
  const pools = await prisma.pool.findMany({
    where: poolId ? { id: poolId } : undefined,
    orderBy: [
      { condominium: { name: 'asc' } },
      { name: 'asc' }
    ],
    include: {
      condominium: true,
      measurements: {
        orderBy: [
          { measuredAt: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 10,
        select: {
          id: true,
          measuredAt: true,
          updatedAt: true,
          createdAt: true,
          responsibleName: true,
          photoData: true,
          photoMimeType: true,
          photoPath: true
        }
      }
    }
  });

  return (
    <>
      <PageHeader
        title="Auditoria de fotos"
        description="Diagnóstico visível no navegador para validar persistência no PostgreSQL, entrega da rota de foto e fallback da página pública/QR Code."
      />
      <div className="grid gap-6">
        <div className="card space-y-3">
          <p className="text-sm text-slate-600">Use esta tela no celular para validar se a última medição recebeu foto no banco e qual imagem a página pública vai usar.</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/debug/fotos" className="rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-700">Ver todas as piscinas</Link>
          </div>
        </div>

        {pools.length === 0 ? (
          <div className="card text-sm text-slate-500">Nenhuma piscina encontrada para o filtro informado.</div>
        ) : (
          pools.map(pool => {
            const latestMeasurement = pool.measurements[0];
            const photoSelection = selectMeasurementPhotoForDisplay(pool.measurements);
            const previousWithPhoto = pool.measurements.slice(1).find(measurement => getMeasurementPhotoState(measurement).kind !== 'missing');

            return (
              <section key={pool.id} className="card space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{pool.condominium.name} — {pool.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">Pool ID: <span className="font-mono">{pool.id}</span></p>
                    <p className="mt-1 text-sm text-slate-500">
                      Página pública:{' '}
                      <Link href={`/public/piscinas/${pool.slug}`} className="font-medium text-brand-700 underline underline-offset-4">
                        /public/piscinas/{pool.slug}
                      </Link>
                    </p>
                  </div>
                  <Link href={`/condominios/${pool.condominiumId}/piscinas/${pool.id}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">Abrir detalhes da piscina</Link>
                </div>

                {!latestMeasurement ? (
                  <p className="text-sm text-slate-500">Sem medições cadastradas.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <AuditCard label="Última medição" value={latestMeasurement.id} />
                    <AuditCard label="photoData na última" value={latestMeasurement.photoData && latestMeasurement.photoData.length > 0 ? `sim (${latestMeasurement.photoData.length} bytes)` : 'não'} />
                    <AuditCard label="photoMimeType na última" value={latestMeasurement.photoMimeType || 'ausente'} />
                    <AuditCard label="photoPath na última" value={latestMeasurement.photoPath || 'ausente'} mono />
                    <AuditCard label="A rota /photo deveria abrir?" value={getMeasurementPhotoState(latestMeasurement).kind !== 'missing' ? 'sim' : 'não'} />
                    <AuditCard label="Foto anterior utilizável" value={previousWithPhoto ? previousWithPhoto.id : 'não existe'} />
                    <AuditCard label="Foto escolhida pela página pública" value={photoSelection ? photoSelection.photoMeasurement.id : 'nenhuma'} />
                    <AuditCard label="Motivo do fallback" value={photoSelection?.usesFallback ? (photoSelection.fallbackReason || 'fallback ativo') : 'sem fallback'} />
                  </div>
                )}

                {latestMeasurement ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-3 pr-4">Medição</th>
                          <th className="py-3 pr-4">Data</th>
                          <th className="py-3 pr-4">Persistência</th>
                          <th className="py-3 pr-4">photoData</th>
                          <th className="py-3 pr-4">photoMimeType</th>
                          <th className="py-3 pr-4">photoPath</th>
                          <th className="py-3 pr-4">Rota /photo</th>
                          <th className="py-3 pr-4">Uso público</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pool.measurements.map(measurement => {
                          const photoState = getMeasurementPhotoState(measurement);
                          const isSelectedByPublicPage = photoSelection?.photoMeasurement.id === measurement.id;
                          const shouldRouteOpen = photoState.kind !== 'missing';
                          const normalizedPath = normalizeLegacyPhotoPath(measurement.photoPath);
                          const normalizedMimeType = normalizeMimeType(measurement.photoMimeType);
                          const routeHref = shouldRouteOpen ? `/api/measurements/${measurement.id}/photo` : undefined;

                          return (
                            <tr key={measurement.id} className="align-top">
                              <td className="py-4 pr-4 font-mono text-xs text-slate-700">{measurement.id}</td>
                              <td className="py-4 pr-4 text-slate-600">{format(measurement.measuredAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</td>
                              <td className="py-4 pr-4 text-slate-600">{describeMeasurementPhotoAvailability(measurement)}</td>
                              <td className="py-4 pr-4 text-slate-600">{measurement.photoData && measurement.photoData.length > 0 ? `${measurement.photoData.length} bytes` : 'ausente'}</td>
                              <td className="py-4 pr-4 text-slate-600">{normalizedMimeType || measurement.photoMimeType || 'ausente'}</td>
                              <td className="py-4 pr-4 text-slate-600 break-all">{normalizedPath || 'ausente'}</td>
                              <td className="py-4 pr-4 text-slate-600">
                                {routeHref ? (
                                  <a href={routeHref} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline underline-offset-4">
                                    Abrir rota
                                  </a>
                                ) : 'não deveria abrir'}
                              </td>
                              <td className="py-4 pr-4 text-slate-600">
                                {isSelectedByPublicPage
                                  ? (photoSelection?.usesFallback ? `fallback visual (${describeFallbackReason(latestMeasurement, measurement)})` : 'última medição')
                                  : 'não usada'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            );
          })
        )}
      </div>
    </>
  );
}

function AuditCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm text-slate-800 ${mono ? 'break-all font-mono' : ''}`}>{value}</p>
    </div>
  );
}
