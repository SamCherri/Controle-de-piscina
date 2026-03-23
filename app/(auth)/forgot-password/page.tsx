import Link from 'next/link';
import { PasswordResetRequestForm } from '@/components/forms/password-reset-request-form';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(12,120,178,0.18),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-4 py-10">
      <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-soft sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Recuperação de acesso</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Esqueci minha senha</h1>
        <p className="mt-3 text-sm text-slate-500">Informe seu e-mail administrativo. Se houver uma conta correspondente, você receberá instruções para redefinir sua senha.</p>
        <PasswordResetRequestForm />
        <Link href="/login" className="mt-6 inline-flex text-sm font-medium text-brand-700 underline">Voltar para login</Link>
      </div>
    </main>
  );
}
