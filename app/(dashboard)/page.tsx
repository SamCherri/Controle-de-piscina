import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';

export default async function DashboardPage() {
  const condominiums = await prisma.condominium.findMany({
    include: {
      pools: {
        include: {
          measurements: {
            orderBy: { measuredAt: 'desc' },
            take: 1
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <>
      <PageHeader title="Painel operacional" description="Acompanhe a situação atual de cada piscina, acesse históricos, gráficos e a página pública por QR Code." actionLabel="Novo condomínio" actionHref="/condominios/novo" />
      <section className="grid gap-6 lg:grid-cols-2">
        {condominiums.map(condominium => (
          <div key={condominium.id} className="card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{condominium.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{condominium.address || 'Endereço não informado'}</p>
              </div>
              <Link href={`/condominios/${condominium.id}`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Abrir</Link>
            </div>
            <div className="grid gap-3">
              {condominium.pools.map(pool => {
                const latest = pool.measurements[0];
                return (
                  <div key={pool.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-800">{pool.name}</h3>
                        <p className="text-sm text-slate-500">{pool.description || 'Sem descrição'}</p>
                      </div>
                      {latest ? <StatusBadge status={latest.overallStatus} /> : <span className="text-xs text-slate-400">Sem medições</span>}
                    </div>
                    {latest ? (
                      <p className="mt-3 text-sm text-slate-500">Última leitura em {format(latest.measuredAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
