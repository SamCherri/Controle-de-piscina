import Link from 'next/link';
import { subDays } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Clock3, ImageOff, ShieldAlert } from 'lucide-react';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { getStatusSummaryMessage } from '@/lib/status';

export const dynamic = 'force-dynamic';

function formatDate(date: Date) {
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export default async function DashboardPage() {
  const staleThreshold = subDays(new Date(), 3);

  const [totalCondominiums, pools, recentMeasurements] = await Promise.all([
    prisma.condominium.count(),
    prisma.pool.findMany({
      include: {
        condominium: { select: { name: true } },
        measurements: { take: 1, orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }] }
      },
      orderBy: { name: 'asc' }
    }),
    prisma.measurement.findMany({
      orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      include: {
        pool: { select: { id: true, name: true, condominium: { select: { name: true } } } }
      }
    })
  ]);

  const totalPools = pools.length;
  const criticalPools = pools.filter(pool => pool.measurements[0]?.overallStatus === 'CRITICAL').length;
  const attentionPools = pools.filter(pool => pool.measurements[0]?.overallStatus === 'ATTENTION').length;
  const poolsWithoutRecentMeasurement = pools.filter(pool => {
    const latest = pool.measurements[0];
    return !latest || latest.measuredAt < staleThreshold;
  }).length;
  const poolsWithoutCoverPhoto = pools.filter(pool => !pool.coverPhotoData || !pool.coverPhotoMimeType).length;

  const responsibleMap = recentMeasurements.reduce<Record<string, number>>((acc, item) => {
    acc[item.responsibleName] = (acc[item.responsibleName] ?? 0) + 1;
    return acc;
  }, {});

  const measurementsByResponsible = Object.entries(responsibleMap)
    .map(([responsibleName, total]) => ({ responsibleName, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const immediateActions = [
    { icon: ShieldAlert, label: 'Piscinas críticas', value: criticalPools, href: '/?status=critical', color: 'text-rose-700 bg-rose-50 border-rose-200' },
    { icon: AlertTriangle, label: 'Piscinas em atenção', value: attentionPools, href: '/?status=attention', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { icon: Clock3, label: 'Sem medição recente', value: poolsWithoutRecentMeasurement, href: '/?status=stale', color: 'text-sky-700 bg-sky-50 border-sky-200' },
    { icon: ImageOff, label: 'Sem foto pública', value: poolsWithoutCoverPhoto, href: '/?status=no-photo', color: 'text-slate-700 bg-slate-100 border-slate-200' }
  ];

  return (
    <>
      <PageHeader
        title="Dashboard executivo"
        description="Monitore risco operacional, medições recentes e produtividade da equipe em um único painel."
        actionLabel="Novo condomínio"
        actionHref="/condominios/novo"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Condomínios" value={String(totalCondominiums)} subtitle="Base ativa" />
        <KpiCard title="Piscinas" value={String(totalPools)} subtitle="Em monitoramento" />
        <KpiCard title="Críticas" value={String(criticalPools)} subtitle="Exigem ação imediata" tone="critical" />
        <KpiCard title="Em atenção" value={String(attentionPools)} subtitle="Ajuste preventivo" tone="attention" />
        <KpiCard title="Sem medição recente" value={String(poolsWithoutRecentMeasurement)} subtitle="Sem leitura em 3 dias" tone="attention" />
        <KpiCard title="Sem foto pública" value={String(poolsWithoutCoverPhoto)} subtitle="Afeta transparência no QR" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ação imediata</h2>
            <p className="text-sm text-slate-500">Priorize itens críticos para preservar segurança e conformidade.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {immediateActions.map(action => (
              <Link key={action.label} href={action.href} className={`rounded-2xl border p-4 ${action.color}`}>
                <div className="flex items-center gap-3">
                  <action.icon className="h-4 w-4" />
                  <p className="text-sm font-semibold">{action.label}</p>
                </div>
                <p className="mt-2 text-2xl font-bold">{action.value}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Equipe responsável</h2>
            <p className="text-sm text-slate-500">Últimos lançamentos por responsável.</p>
          </div>
          {measurementsByResponsible.length > 0 ? (
            <ul className="space-y-2">
              {measurementsByResponsible.map(item => (
                <li key={item.responsibleName} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">{item.responsibleName}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.total} medições</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Nenhuma medição registrada ainda. Assim que a equipe lançar a primeira leitura, este ranking aparecerá aqui." />
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Últimas medições</h2>
          {recentMeasurements.length > 0 ? (
            <div className="space-y-2">
              {recentMeasurements.slice(0, 8).map(measurement => (
                <article key={measurement.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{measurement.pool.condominium.name} • {measurement.pool.name}</p>
                    <StatusBadge status={measurement.overallStatus} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{measurement.responsibleName} • {formatDate(measurement.measuredAt)}</p>
                  <p className="mt-2 text-sm text-slate-600">{getStatusSummaryMessage(measurement.overallStatus)}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState message="Sem medições recentes. Use o botão “Nova medição” dentro da piscina para iniciar o histórico operacional." />
          )}
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Visão rápida por piscina</h2>
          <div className="space-y-2">
            {pools.length > 0 ? pools.map(pool => {
              const latest = pool.measurements[0];

              return (
                <Link key={pool.id} href={`/condominios/${pool.condominiumId}/piscinas/${pool.id}`} className="block rounded-2xl border border-slate-200 p-3 hover:bg-slate-50">
                  <p className="font-medium text-slate-800">{pool.name}</p>
                  <p className="text-xs text-slate-500">{pool.condominium.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    {latest ? <StatusBadge status={latest.overallStatus} /> : <span className="text-xs text-slate-400">Sem medição</span>}
                    {latest ? <span className="text-xs text-slate-500">{formatDate(latest.measuredAt)}</span> : null}
                  </div>
                </Link>
              );
            }) : <EmptyState message="Nenhuma piscina cadastrada. Cadastre a primeira piscina para liberar a operação completa." />}
          </div>
        </div>
      </section>
    </>
  );
}

function KpiCard({ title, value, subtitle, tone = 'normal' }: { title: string; value: string; subtitle: string; tone?: 'normal' | 'attention' | 'critical' }) {
  const toneMap = {
    normal: 'border-slate-200 bg-white',
    attention: 'border-amber-200 bg-amber-50/40',
    critical: 'border-rose-200 bg-rose-50/40'
  };

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">{message}</div>;
}
