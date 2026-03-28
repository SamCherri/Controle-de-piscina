import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <DashboardSidebar />

      <div className="flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Olá, {user.name}</p>
                <h1 className="text-lg font-semibold text-slate-900">Central operacional de piscinas</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/usuarios" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 lg:hidden">Usuários</Link>
                <Link href="/condominios/novo" className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Novo condomínio</Link>
                <LogoutButton />
              </div>
            </div>
            <Breadcrumbs />
          </div>
        </header>

        <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
