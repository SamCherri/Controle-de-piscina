import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { PoolForm } from '@/components/forms/pool-form';

export default async function NewPoolPage({ params }: { params: { condominiumId: string } }) {
  const condominium = await prisma.condominium.findUnique({ where: { id: params.condominiumId } });
  if (!condominium) notFound();

  return (
    <>
      <PageHeader title={`Nova piscina em ${condominium.name}`} description="Defina a identificação da piscina e as faixas ideais de referência para classificação automática." />
      <PoolForm condominiumId={condominium.id} />
    </>
  );
}
