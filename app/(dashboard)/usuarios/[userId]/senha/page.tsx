import { notFound } from 'next/navigation';
import { AdminUserPasswordResetForm } from '@/components/forms/admin-user-password-reset-form';
import { PageHeader } from '@/components/page-header';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function ResetUserPasswordPage({ params }: { params: { userId: string } }) {
  await requireAdminSession();

  const user = await prisma.adminUser.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  if (!user) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Redefinir senha" description={`Defina uma nova senha interna para ${user.name} (${user.email}).`} />
      <AdminUserPasswordResetForm userId={user.id} />
    </>
  );
}
