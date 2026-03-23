'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { resetAdminUserPasswordAction, type ActionState } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white">{pending ? 'Redefinindo...' : 'Redefinir senha'}</button>;
}

export function AdminUserPasswordResetForm({ userId }: { userId: string }) {
  const [state, action] = useFormState<ActionState, FormData>(resetAdminUserPasswordAction, {});

  return (
    <form action={action} className="card grid gap-4">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="password">Nova senha</label>
          <input id="password" name="password" type="password" placeholder="Nova senha" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirmPassword">Confirmar nova senha</label>
          <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a nova senha" required />
        </div>
      </div>
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Após a redefinição, o usuário será obrigado a trocar a senha no próximo login.</p>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="flex justify-end"><SubmitButton /></div>
    </form>
  );
}
