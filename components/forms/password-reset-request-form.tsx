'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { requestPasswordResetAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="mt-6 w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white" type="submit" disabled={pending}>
      {pending ? 'Enviando...' : 'Solicitar redefinição'}
    </button>
  );
}

export function PasswordResetRequestForm() {
  const [state, action] = useFormState(requestPasswordResetAction, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <div className="space-y-2">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" placeholder="admin@condominio.com" required />
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      {state.success ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p>{state.success}</p>
          {state.resetUrlPreview ? (
            <p className="mt-2 break-all text-xs">
              Link de desenvolvimento: <a className="font-medium underline" href={state.resetUrlPreview}>{state.resetUrlPreview}</a>
            </p>
          ) : null}
        </div>
      ) : null}
      <SubmitButton />
    </form>
  );
}
