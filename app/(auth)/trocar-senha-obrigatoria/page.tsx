import { redirect } from 'next/navigation';
import { ForcePasswordChangeForm } from '@/components/forms/force-password-change-form';
import { getSession } from '@/lib/session';

export default async function ForcePasswordChangePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.mustChangePassword) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(12,120,178,0.18),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-4 py-10">
      <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-soft sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Ação obrigatória</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Troque sua senha temporária</h1>
        <p className="mt-3 text-sm text-slate-500">Olá, {session.name}. Antes de acessar o painel, você precisa definir uma senha definitiva.</p>
        <ForcePasswordChangeForm />
      </div>
    </main>
  );
}
