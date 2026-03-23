'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { loginAction } from '@/lib/actions';
import { getLoginHelpContent } from '@/lib/auth/login-help';

type DefaultAdminCredentials = {
  email: string;
  password?: string;
  name: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="mt-6 w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white" type="submit" disabled={pending}>
      {pending ? 'Entrando...' : 'Entrar'}
    </button>
  );
}

export function LoginForm({ defaultAdmin }: { defaultAdmin: DefaultAdminCredentials }) {
  const [state, action] = useFormState(loginAction, {});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const help = getLoginHelpContent({
    defaultAdmin: {
      email: defaultAdmin.email,
      name: defaultAdmin.name
    }
  });

  function fillDefaultCredentials() {
    if (!help.showDevelopmentFillAction || !defaultAdmin.password) {
      return;
    }

    setEmail(defaultAdmin.email);
    setPassword(defaultAdmin.password);
  }

  return (
    <form action={action} className="mt-8 space-y-4">
      <div className="space-y-2">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="admin@condominio.com"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-brand-700 underline">Esqueci minha senha</Link>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{help.title}</p>
            <p>{help.description}</p>
            {help.nameLabel ? <p><strong>Nome:</strong> {help.nameLabel}</p> : null}
            {help.emailLabel ? <p><strong>E-mail:</strong> {help.emailLabel}</p> : null}
            <p className="text-xs text-amber-700">No primeiro login com senha temporária, o sistema exigirá a troca imediata da senha.</p>
          </div>
          {help.showDevelopmentFillAction ? (
            <button
              type="button"
              onClick={fillDefaultCredentials}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Preencher acesso local
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          O administrador inicial pode ser provisionado pelas variáveis <code>DEFAULT_ADMIN_EMAIL</code>, <code>DEFAULT_ADMIN_PASSWORD</code> e <code>DEFAULT_ADMIN_NAME</code>. A senha nunca é exibida na interface.
        </p>
      </div>
      <SubmitButton />
    </form>
  );
}
