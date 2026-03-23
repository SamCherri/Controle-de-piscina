'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { deleteAdminUserAction, type ActionState } from '@/lib/actions';

function DeleteButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700">{pending ? 'Excluindo...' : 'Excluir'}</button>;
}

export function DeleteAdminUserForm({ userId, userLabel }: { userId: string; userLabel: string }) {
  const [state, action] = useFormState<ActionState, FormData>(deleteAdminUserAction, {});

  return (
    <form
      action={action}
      className="space-y-2"
      onSubmit={event => {
        if (!window.confirm(`Confirma a exclusão do usuário ${userLabel}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <DeleteButton />
      {state.error ? <p className="max-w-xs text-xs text-rose-700">{state.error}</p> : null}
    </form>
  );
}
