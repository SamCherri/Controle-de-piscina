import { PageHeader } from '@/components/page-header';
import { CondominiumForm } from '@/components/forms/condominium-form';

export default function NewCondominiumPage() {
  return (
    <>
      <PageHeader title="Novo condomínio" description="Cadastre o condomínio para organizar várias piscinas, responsáveis e páginas públicas por QR Code." />
      <CondominiumForm />
    </>
  );
}
