'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { resetPasswordAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="mt-6 w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white" type="submit" disabled={pending}>
      {pending ? 'Redefinindo...' : 'Redefinir senha'}
    </button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useFormState(resetPasswordAction, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <label htmlFor="password">Nova senha</label>
        <input id="password" name="password" type="password" placeholder="Nova senha" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword">Confirmar nova senha</label>
        <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirme a senha" required />
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{state.success}</p> : null}
      <SubmitButton />
    </form>
  );
}
