'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createPoolAction, updatePoolAction } from '@/lib/actions';

type PoolFormInitialValues = {
  id?: string;
  condominiumId: string;
  name: string;
  description?: string | null;
  locationNote?: string | null;
  idealChlorineMin: number;
  idealChlorineMax: number;
  idealPhMin: number;
  idealPhMax: number;
  idealAlkalinityMin: number;
  idealAlkalinityMax: number;
  idealHardnessMin: number;
  idealHardnessMax: number;
  idealTemperatureMin: number;
  idealTemperatureMax: number;
};

type PoolFormProps = {
  condominiumId: string;
  initialValues?: PoolFormInitialValues;
  mode?: 'create' | 'edit';
};

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();

  const idleLabel = mode === 'edit' ? 'Salvar alterações' : 'Salvar piscina';
  const pendingLabel = mode === 'edit' ? 'Salvando alterações...' : 'Salvando...';

  return (
    <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

const DEFAULT_NUMERIC_FIELDS = [
  ['idealChlorineMin', 'Cloro mín.', 1],
  ['idealChlorineMax', 'Cloro máx.', 3],
  ['idealPhMin', 'pH mín.', 7.2],
  ['idealPhMax', 'pH máx.', 7.8],
  ['idealAlkalinityMin', 'Alcalinidade mín.', 80],
  ['idealAlkalinityMax', 'Alcalinidade máx.', 120],
  ['idealHardnessMin', 'Dureza mín.', 200],
  ['idealHardnessMax', 'Dureza máx.', 400],
  ['idealTemperatureMin', 'Temperatura mín.', 24],
  ['idealTemperatureMax', 'Temperatura máx.', 30]
] as const;

export function PoolForm({ condominiumId, initialValues, mode = 'create' }: PoolFormProps) {
  const [state, action] = useFormState(mode === 'edit' ? updatePoolAction : createPoolAction, {});

  return (
    <form action={action} className="card grid gap-5">
      <input type="hidden" name="condominiumId" value={condominiumId} />
      {mode === 'edit' ? <input type="hidden" name="poolId" value={initialValues?.id ?? ''} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="name">Identificação da piscina</label>
          <input id="name" name="name" placeholder="Piscina adulto" required defaultValue={initialValues?.name ?? ''} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="description">Descrição</label>
          <input
            id="description"
            name="description"
            placeholder="Piscina principal do bloco A"
            defaultValue={initialValues?.description ?? ''}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="locationNote">Observação de localização</label>
          <input
            id="locationNote"
            name="locationNote"
            placeholder="Ao lado do salão de festas"
            defaultValue={initialValues?.locationNote ?? ''}
          />
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Faixas ideais configuráveis</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {DEFAULT_NUMERIC_FIELDS.map(([name, label, fallbackValue]) => (
            <div key={name} className="space-y-2">
              <label htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                defaultValue={initialValues?.[name] ?? fallbackValue}
                type="number"
                step="0.1"
                required
              />
            </div>
          ))}
        </div>
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="flex justify-end">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
