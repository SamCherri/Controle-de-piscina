'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createPoolAction, updatePoolAction } from '@/lib/actions';

type PoolFormInitialValues = {
  id?: string;
  condominiumId: string;
  name: string;
  description?: string | null;
  locationNote?: string | null;
  hasCoverPhoto?: boolean;
  tracksTemperature?: boolean;
  idealChlorineMin: number;
  idealChlorineMax: number;
  idealPhMin: number;
  idealPhMax: number;
  idealAlkalinityMin: number;
  idealAlkalinityMax: number;
  idealHardnessMin: number;
  idealHardnessMax: number;
  idealTemperatureMin?: number | null;
  idealTemperatureMax?: number | null;
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
  ['idealHardnessMax', 'Dureza máx.', 400]
] as const;

const TEMPERATURE_FIELDS = [
  ['idealTemperatureMin', 'Temperatura mín.', 24],
  ['idealTemperatureMax', 'Temperatura máx.', 30]
] as const;

export function PoolForm({ condominiumId, initialValues, mode = 'create' }: PoolFormProps) {
  const [state, action] = useFormState(mode === 'edit' ? updatePoolAction : createPoolAction, {});
  const [tracksTemperature, setTracksTemperature] = useState(initialValues?.tracksTemperature ?? true);
  const coverPhotoPreviewUrl = initialValues?.id && initialValues?.hasCoverPhoto
    ? `/api/pools/${initialValues.id}/cover-photo`
    : undefined;

  return (
    <form action={action} encType="multipart/form-data" className="card grid gap-5">
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
        <div className="space-y-3 md:col-span-2">
          <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-800" htmlFor="tracksTemperature">
            <input
              id="tracksTemperature"
              name="tracksTemperature"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
              checked={tracksTemperature}
              onChange={event => setTracksTemperature(event.target.checked)}
            />
            Esta piscina controla temperatura
          </label>
          <p className="text-xs text-slate-500">Desative para piscinas não aquecidas. A temperatura deixará de ser obrigatória nas medições e sairá dos painéis.</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="coverPhoto">Foto fixa da piscina (modo compartilhar)</label>
          <input id="coverPhoto" name="coverPhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />
          <p className="text-xs text-slate-500">Aceita JPG, PNG ou WEBP com até 5 MB. Esta foto aparece no modo compartilhar do QR Code.</p>
          {coverPhotoPreviewUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-medium text-slate-600">Foto atual cadastrada</p>
              <Image
                src={coverPhotoPreviewUrl}
                alt={`Foto fixa da piscina ${initialValues?.name ?? ''}`}
                width={960}
                height={540}
                className="h-48 w-full rounded-xl object-cover"
              />
            </div>
          ) : null}
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
          {tracksTemperature
            ? TEMPERATURE_FIELDS.map(([name, label, fallbackValue]) => (
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
            ))
            : null}
        </div>
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="flex justify-end">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
