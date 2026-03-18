'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createPoolAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white">{pending ? 'Salvando...' : 'Salvar piscina'}</button>;
}

export function PoolForm({ condominiumId }: { condominiumId: string }) {
  const [state, action] = useFormState(createPoolAction, {});

  return (
    <form action={action} className="card grid gap-5">
      <input type="hidden" name="condominiumId" value={condominiumId} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="name">Identificação da piscina</label>
          <input id="name" name="name" placeholder="Piscina adulto" required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="description">Descrição</label>
          <input id="description" name="description" placeholder="Piscina principal do bloco A" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="locationNote">Observação de localização</label>
          <input id="locationNote" name="locationNote" placeholder="Ao lado do salão de festas" />
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Faixas ideais configuráveis</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ['idealChlorineMin', 'Cloro mín.', '1'], ['idealChlorineMax', 'Cloro máx.', '3'],
            ['idealPhMin', 'pH mín.', '7.2'], ['idealPhMax', 'pH máx.', '7.8'],
            ['idealAlkalinityMin', 'Alcalinidade mín.', '80'], ['idealAlkalinityMax', 'Alcalinidade máx.', '120'],
            ['idealHardnessMin', 'Dureza mín.', '200'], ['idealHardnessMax', 'Dureza máx.', '400'],
            ['idealTemperatureMin', 'Temperatura mín.', '24'], ['idealTemperatureMax', 'Temperatura máx.', '30']
          ].map(([name, label, value]) => (
            <div key={name as string} className="space-y-2">
              <label htmlFor={name as string}>{label as string}</label>
              <input id={name as string} name={name as string} defaultValue={value as string} type="number" step="0.1" required />
            </div>
          ))}
        </div>
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="flex justify-end"><SubmitButton /></div>
    </form>
  );
}
