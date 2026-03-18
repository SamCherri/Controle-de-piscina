'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="mt-6 w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white" type="submit" disabled={pending}>
      {pending ? 'Entrando...' : 'Entrar'}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(loginAction, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <div className="space-y-2">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" placeholder="admin@condominio.com" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" placeholder="••••••••" required />
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
        <p><strong>Seed padrão:</strong> admin@piscina.com</p>
        <p><strong>Senha:</strong> admin123</p>
      </div>
      <SubmitButton />
    </form>
  );
}
