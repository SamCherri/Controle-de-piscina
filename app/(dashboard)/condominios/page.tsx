import Link from 'next/link';
import { Building2, MapPin, Waves } from 'lucide-react';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function CondominiumsPage() {
  const condominiums = await prisma.condominium.findMany({
    include: {
      pools: {
        select: {
          id: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  const totalPools = condominiums.reduce((acc, condominium) => acc + condominium.pools.length, 0);

  return (
    <>
      <PageHeader
        title="Condomínios"
        description="Gerencie os locais monitorados e acesse rapidamente as piscinas de cada condomínio."
        actionLabel="Novo condomínio"
        actionHref="/condominios/novo"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Condomínios ativos</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{condominiums.length}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Piscinas cadastradas</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalPools}</p>
        </article>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Lista de condomínios</h2>
          <p className="text-sm text-slate-500">Selecione um condomínio para abrir o painel detalhado das piscinas.</p>
        </div>

        {condominiums.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {condominiums.map(condominium => (
              <Link
                key={condominium.id}
                href={`/condominios/${condominium.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:bg-brand-50/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{condominium.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{condominium.address || 'Endereço não informado'}</p>
                  </div>
                  <Building2 className="h-5 w-5 text-brand-600" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    <Waves className="h-3.5 w-3.5" />
                    {condominium.pools.length} piscina(s)
                  </span>
                  {condominium.address ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Endereço cadastrado
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Nenhum condomínio cadastrado ainda. Use o botão “Novo condomínio” para iniciar a operação.
          </div>
        )}
      </section>
    </>
  );
}
