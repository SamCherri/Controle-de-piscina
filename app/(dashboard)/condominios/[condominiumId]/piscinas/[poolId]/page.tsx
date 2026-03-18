import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { MetricCard } from '@/components/metric-card';
import { DashboardChart } from '@/components/dashboard-chart';
import { deleteMeasurementAction } from '@/lib/actions';
import { statusMeta } from '@/lib/status';

export default async function PoolPage({ params }: { params: { condominiumId: string; poolId: string } }) {
  const pool = await prisma.pool.findUnique({
    where: { id: params.poolId },
    include: {
      condominium: true,
      measurements: {
        orderBy: { measuredAt: 'desc' },
        take: 30
      }
    }
  });

  if (!pool || pool.condominiumId !== params.condominiumId) notFound();

  const latest = pool.measurements[0];
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/public/piscinas/${pool.slug}`;
  const qrCode = await QRCode.toDataURL(publicUrl, { margin: 1, width: 280 });
  const chartData = [...pool.measurements]
    .reverse()
    .map(item => ({
      label: format(item.measuredAt, 'dd/MM'),
      cloro: item.chlorine,
      ph: item.ph,
      temperatura: item.temperature
    }));

  return (
    <>
      <PageHeader title={pool.name} description={`Condomínio ${pool.condominium.name}. Monitore status atual, histórico completo, foto mais recente e QR Code da página pública.`} actionLabel="Nova medição" actionHref={`/condominios/${pool.condominiumId}/piscinas/${pool.id}/medicoes/nova`} />
      {latest ? (
        <section className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-6">
            <div className="card space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Status atual</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Última atualização em {format(latest.measuredAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</h2>
                  <p className="mt-2 text-sm text-slate-500">Responsável: {latest.responsibleName}</p>
                </div>
                <div className="space-y-2 text-right">
                  <StatusBadge status={latest.overallStatus} />
                  <p className="text-sm text-slate-500">{statusMeta[latest.overallStatus].message}</p>
                </div>
              </div>
              <div className="metric-grid">
                <MetricCard label="Cloro" value={latest.chlorine} unit="ppm" status={latest.chlorineStatus} range={`${pool.idealChlorineMin} a ${pool.idealChlorineMax} ppm`} />
                <MetricCard label="pH" value={latest.ph} unit="" status={latest.phStatus} range={`${pool.idealPhMin} a ${pool.idealPhMax}`} />
                <MetricCard label="Alcalinidade" value={latest.alkalinity} unit="ppm" status={latest.alkalinityStatus} range={`${pool.idealAlkalinityMin} a ${pool.idealAlkalinityMax} ppm`} />
                <MetricCard label="Dureza cálcica" value={latest.hardness} unit="ppm" status={latest.hardnessStatus} range={`${pool.idealHardnessMin} a ${pool.idealHardnessMax} ppm`} />
                <MetricCard label="Temperatura" value={latest.temperature} unit="°C" status={latest.temperatureStatus} range={`${pool.idealTemperatureMin} a ${pool.idealTemperatureMax} °C`} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Produtos aplicados</p>
                  <p className="mt-2 text-sm text-slate-600">{latest.productsApplied}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Observações</p>
                  <p className="mt-2 text-sm text-slate-600">{latest.observations || 'Sem observações.'}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Gráficos por período</h3>
                  <p className="text-sm text-slate-500">Últimas 30 medições de cloro, pH e temperatura.</p>
                </div>
              </div>
              <DashboardChart data={chartData} />
            </div>
            <div className="card overflow-hidden">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Histórico completo</h3>
                  <p className="text-sm text-slate-500">Auditoria mínima com data, hora e responsável por lançamento.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-3 pr-4">Data</th>
                      <th className="py-3 pr-4">Responsável</th>
                      <th className="py-3 pr-4">Cloro</th>
                      <th className="py-3 pr-4">pH</th>
                      <th className="py-3 pr-4">Temp.</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pool.measurements.map(item => (
                      <tr key={item.id} className="align-top">
                        <td className="py-4 pr-4 text-slate-600">{format(item.measuredAt, 'dd/MM/yyyy HH:mm')}</td>
                        <td className="py-4 pr-4 text-slate-600">{item.responsibleName}</td>
                        <td className="py-4 pr-4 text-slate-600">{item.chlorine}</td>
                        <td className="py-4 pr-4 text-slate-600">{item.ph}</td>
                        <td className="py-4 pr-4 text-slate-600">{item.temperature} °C</td>
                        <td className="py-4 pr-4"><StatusBadge status={item.overallStatus} /></td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/condominios/${pool.condominiumId}/piscinas/${pool.id}/medicoes/${item.id}/editar`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">Editar</Link>
                            <form action={deleteMeasurementAction}>
                              <input type="hidden" name="measurementId" value={item.id} />
                              <input type="hidden" name="poolId" value={pool.id} />
                              <input type="hidden" name="condominiumId" value={pool.condominiumId} />
                              <button type="submit" className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600">Excluir</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <aside className="space-y-6">
            <div className="card space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">QR Code da piscina</h3>
              <Image src={qrCode} alt="QR Code da página pública" width={280} height={280} className="mx-auto rounded-2xl border border-slate-200 bg-white p-3" unoptimized />
              <p className="text-xs text-slate-500">URL pública: {publicUrl}</p>
              <Link href={`/public/piscinas/${pool.slug}`} className="inline-flex w-full items-center justify-center rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white">Abrir tela pública</Link>
            </div>
            <div className="card space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">Foto mais recente</h3>
              {latest.photoPath ? (
                <Image src={latest.photoPath} alt={pool.name} width={800} height={600} className="h-auto w-full rounded-2xl object-cover" />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">Nenhuma foto enviada até o momento.</div>
              )}
            </div>
          </aside>
        </section>
      ) : (
        <div className="card text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Sem medições ainda</h2>
          <p className="mt-2 text-sm text-slate-500">Cadastre a primeira medição para liberar painel analítico, histórico e página pública por QR Code.</p>
          <Link href={`/condominios/${pool.condominiumId}/piscinas/${pool.id}/medicoes/nova`} className="mt-6 inline-flex rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white">Registrar primeira medição</Link>
        </div>
      )}
    </>
  );
}
