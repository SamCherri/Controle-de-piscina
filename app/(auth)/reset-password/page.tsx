import Link from 'next/link';
import { ResetPasswordForm } from '@/components/forms/reset-password-form';

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token?.trim() || '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(12,120,178,0.18),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-4 py-10">
      <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-soft sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Redefinição segura</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Definir nova senha</h1>
        <p className="mt-3 text-sm text-slate-500">Use uma senha forte. O token é de uso único e expira em pouco tempo.</p>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Token de redefinição ausente ou inválido.</p>
        )}
        <Link href="/login" className="mt-6 inline-flex text-sm font-medium text-brand-700 underline">Voltar para login</Link>
      </div>
    </main>
  );
}
