'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createCondominiumAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white">{pending ? 'Salvando...' : 'Salvar condomínio'}</button>;
}

export function CondominiumForm() {
  const [state, action] = useFormState(createCondominiumAction, {});

  return (
    <form action={action} className="card grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="name">Nome do condomínio</label>
          <input id="name" name="name" placeholder="Condomínio Residencial Atlântico" required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="address">Endereço</label>
          <input id="address" name="address" placeholder="Rua Exemplo, 100 - Bairro" />
        </div>
        <div className="space-y-2">
          <label htmlFor="contactName">Contato principal</label>
          <input id="contactName" name="contactName" placeholder="Síndico ou zelador" />
        </div>
        <div className="space-y-2">
          <label htmlFor="contactPhone">Telefone</label>
          <input id="contactPhone" name="contactPhone" placeholder="(11) 99999-9999" />
        </div>
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="flex justify-end"><SubmitButton /></div>
    </form>
  );
}
