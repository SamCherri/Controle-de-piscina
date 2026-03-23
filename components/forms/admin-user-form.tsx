'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { AdminUserRole } from '@/lib/auth/roles';
import { createAdminUserAction, updateAdminUserAction, type ActionState } from '@/lib/actions';

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white">{pending ? pendingLabel : label}</button>;
}

type AdminUserFormProps = {
  mode: 'create' | 'update';
  user?: {
    id: string;
    name: string;
    email: string;
    role: AdminUserRole;
  };
};

const ROLES: Array<{ value: AdminUserRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' }
];

export function AdminUserForm({ mode, user }: AdminUserFormProps) {
  const action = mode === 'create' ? createAdminUserAction : updateAdminUserAction;
  const [state, formAction] = useFormState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="card grid gap-4">
      {mode === 'update' && user ? <input type="hidden" name="userId" value={user.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="name">Nome</label>
          <input id="name" name="name" defaultValue={user?.name ?? ''} placeholder="Nome do usuário" required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" defaultValue={user?.email ?? ''} placeholder="usuario@empresa.com" required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue={user?.role ?? 'operator'} required>
            {ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        </div>
        {mode === 'create' ? (
          <>
            <div className="space-y-2">
              <label htmlFor="password">Senha</label>
              <input id="password" name="password" type="password" placeholder="Senha forte" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a senha" required />
            </div>
          </>
        ) : null}
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="flex justify-end">
        <SubmitButton label={mode === 'create' ? 'Criar usuário' : 'Salvar alterações'} pendingLabel={mode === 'create' ? 'Criando...' : 'Salvando...'} />
      </div>
    </form>
  );
}
