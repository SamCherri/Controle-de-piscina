import Image from 'next/image';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { prisma } from '@/lib/db';

function formatResidentDate(date: Date) {
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export default async function PublicPoolPage({ params }: { params: { slug: string } }) {
  const pool = await prisma.pool.findUnique({
    where: { slug: params.slug },
    include: {
      condominium: true,
      measurements: {
        orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
        take: 1,
        select: {
          measuredAt: true,
          temperature: true
        }
      }
    }
  });

  if (!pool) notFound();

  const latestMeasurement = pool.measurements[0];
  const hasCoverPhoto = Boolean(pool.coverPhotoData && pool.coverPhotoMimeType);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:py-10">
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
        <header className="space-y-1 border-b border-slate-100 px-5 pb-4 pt-5 md:px-8 md:pt-7">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-700">Modo morador</p>
          <h1 className="text-2xl font-semibold leading-tight md:text-3xl">{pool.condominium.name}</h1>
          <p className="text-sm text-slate-600 md:text-base">{pool.name}</p>
        </header>

        <div className="px-5 py-5 md:px-8 md:py-7">
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
              <p className="max-w-xs text-sm text-slate-500">Foto da piscina ainda não cadastrada. Solicite ao responsável do condomínio para adicionar a imagem do modo morador.</p>
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-brand-600 px-5 py-5 text-white md:px-6 md:py-6">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-100">Temperatura atual</p>
            {latestMeasurement ? (
              <p className="mt-2 text-5xl font-semibold leading-none md:text-6xl">{latestMeasurement.temperature.toFixed(1)}°C</p>
            ) : (
              <p className="mt-3 text-lg font-medium">Sem medição disponível no momento</p>
            )}
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {latestMeasurement
              ? `Última atualização em ${formatResidentDate(latestMeasurement.measuredAt)}.`
              : 'Ainda não foi registrada nenhuma medição para esta piscina.'}
          </p>
        </div>
      </section>
    </main>
  );
}
