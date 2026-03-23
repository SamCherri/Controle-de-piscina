import { AdminUserForm } from '@/components/forms/admin-user-form';
import { PageHeader } from '@/components/page-header';
import { requireAdminSession } from '@/lib/auth';

export default async function NewUserPage() {
  await requireAdminSession();

  return (
    <>
      <PageHeader title="Novo usuário administrativo" description="Cadastre um novo acesso interno para o painel." />
      <AdminUserForm mode="create" />
    </>
  );
}
