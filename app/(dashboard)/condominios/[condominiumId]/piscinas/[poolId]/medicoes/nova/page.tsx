import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { MeasurementForm } from '@/components/forms/measurement-form';

function currentLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function NewMeasurementPage({ params }: { params: { condominiumId: string; poolId: string } }) {
  const pool = await prisma.pool.findUnique({ where: { id: params.poolId } });
  if (!pool || pool.condominiumId !== params.condominiumId) notFound();

  return (
    <>
      <PageHeader title={`Nova medição - ${pool.name}`} description="Faça o lançamento rápido dos parâmetros, produtos aplicados, foto e observações da piscina." />
      <MeasurementForm poolId={pool.id} defaults={{ measuredAt: currentLocalDateTime(), responsibleName: '', chlorine: 1.5, ph: 7.4, alkalinity: 95, hardness: 240, temperature: 27, productsApplied: '' }} />
    </>
  );
}
