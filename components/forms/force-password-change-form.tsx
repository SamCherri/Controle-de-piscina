'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { forcePasswordChangeAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="mt-6 w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white" type="submit" disabled={pending}>
      {pending ? 'Atualizando...' : 'Atualizar senha'}
    </button>
  );
}

export function ForcePasswordChangeForm() {
  const [state, action] = useFormState(forcePasswordChangeAction, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <div className="space-y-2">
        <label htmlFor="currentPassword">Senha atual</label>
        <input id="currentPassword" name="currentPassword" type="password" placeholder="Senha atual" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="password">Nova senha</label>
        <input id="password" name="password" type="password" placeholder="Nova senha forte" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword">Confirmar nova senha</label>
        <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a nova senha" required />
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Por segurança, é obrigatório trocar a senha temporária antes de acessar o painel.
      </div>
      <SubmitButton />
    </form>
  );
}
