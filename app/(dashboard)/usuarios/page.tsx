import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/page-header';
import { DeleteAdminUserForm } from '@/components/forms/delete-admin-user-form';
import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const currentUser = await requireAdminSession();
  const users = await prisma.adminUser.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }]
  });

  return (
    <>
      <PageHeader
        title="Usuários administrativos"
        description="Gerencie acessos internos do painel, incluindo criação, edição, redefinição de senha e exclusão segura."
        actionLabel="Novo usuário"
        actionHref="/usuarios/novo"
      />
      <section className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-3 pr-4 font-medium">Nome</th>
              <th className="py-3 pr-4 font-medium">E-mail</th>
              <th className="py-3 pr-4 font-medium">Role</th>
              <th className="py-3 pr-4 font-medium">Criado em</th>
              <th className="py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id}>
                <td className="py-4 pr-4">
                  <div className="font-medium text-slate-900">{user.name}</div>
                  {user.id === currentUser.id ? <div className="text-xs text-brand-600">Usuário da sessão atual</div> : null}
                </td>
                <td className="py-4 pr-4 text-slate-600">{user.email}</td>
                <td className="py-4 pr-4 text-slate-600">{user.role}</td>
                <td className="py-4 pr-4 text-slate-600">{format(user.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</td>
                <td className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/usuarios/${user.id}/editar`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Editar</Link>
                    <Link href={`/usuarios/${user.id}/senha`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Redefinir senha</Link>
                    <DeleteAdminUserForm userId={user.id} userLabel={user.email} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
