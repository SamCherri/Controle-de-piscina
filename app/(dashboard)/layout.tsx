import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-lg font-semibold text-slate-900">Controle de Piscina</Link>
            <p className="text-sm text-slate-500">Olá, {user.name}. Faça os lançamentos operacionais da piscina.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/usuarios" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Usuários</Link>
            <Link href="/condominios/novo" className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-medium text-white">Novo condomínio</Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
