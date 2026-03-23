import { notFound } from 'next/navigation';
import { AdminUserForm } from '@/components/forms/admin-user-form';
import { PageHeader } from '@/components/page-header';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { AdminUserRole } from '@/lib/auth/roles';

export default async function EditUserPage({ params }: { params: { userId: string } }) {
  await requireAdminSession();

  const user = await prisma.adminUser.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });

  if (!user) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Editar usuário" description="Atualize nome, e-mail e role do usuário selecionado." />
      <AdminUserForm
        mode="update"
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as AdminUserRole
        }}
      />
    </>
  );
}
