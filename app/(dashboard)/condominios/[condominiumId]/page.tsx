import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';

export default async function CondominiumPage({ params }: { params: { condominiumId: string } }) {
  const condominium = await prisma.condominium.findUnique({
    where: { id: params.condominiumId },
    include: {
      pools: {
        include: {
          measurements: {
            orderBy: { measuredAt: 'desc' },
            take: 1
          }
        }
      }
    }
  });

  if (!condominium) notFound();

  return (
    <>
      <PageHeader title={condominium.name} description={condominium.address || 'Gerencie as piscinas, medições, QR Codes e o modo morador deste condomínio.'} actionLabel="Cadastrar piscina" actionHref={`/condominios/${condominium.id}/piscinas/nova`} />
      <div className="grid gap-6 lg:grid-cols-2">
        {condominium.pools.map(pool => {
          const latest = pool.measurements[0];
          return (
            <article key={pool.id} className="card space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{pool.name}</h2>
                  <p className="text-sm text-slate-500">{pool.description || 'Sem descrição complementar'}</p>
                </div>
                {latest ? <StatusBadge status={latest.overallStatus} /> : null}
              </div>
              <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p><strong>Faixas:</strong> Cloro {pool.idealChlorineMin}-{pool.idealChlorineMax} ppm • pH {pool.idealPhMin}-{pool.idealPhMax}</p>
                <p><strong>Alcalinidade:</strong> {pool.idealAlkalinityMin}-{pool.idealAlkalinityMax} ppm • <strong>Dureza:</strong> {pool.idealHardnessMin}-{pool.idealHardnessMax} ppm</p>
                <p><strong>Temperatura:</strong> {pool.idealTemperatureMin}-{pool.idealTemperatureMax} °C</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/condominios/${condominium.id}/piscinas/${pool.id}`} className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-medium text-white">Ver painel</Link>
                <Link href={`/condominios/${condominium.id}/piscinas/${pool.id}/editar`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Editar configuração</Link>
                <Link href={`/public/piscinas/${pool.slug}`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Modo morador</Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
