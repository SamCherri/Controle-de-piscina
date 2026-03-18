import { LoginForm } from '@/components/forms/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(12,120,178,0.18),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-soft lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-gradient-to-br from-brand-900 to-brand-500 p-10 text-white lg:block">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-100">PWA + Painel operacional</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Controle profissional da piscina do condomínio.</h1>
          <p className="mt-4 text-sm text-brand-50/90">Monitore parâmetros, registre produtos, faça upload de fotos e publique a situação atual via QR Code para moradores, síndico e administradora.</p>
          <div className="mt-10 space-y-4 text-sm text-brand-50/90">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">✔ Histórico completo por piscina</div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">✔ Classificação automática: normal, atenção e crítico</div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">✔ Área pública pronta para QR Code e acesso mobile</div>
          </div>
        </section>
        <section className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Acesso administrativo</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Entrar na plataforma</h2>
            <p className="mt-3 text-sm text-slate-500">Use o usuário criado no seed inicial para gerenciar condomínios, piscinas, medições, gráficos e página pública.</p>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
