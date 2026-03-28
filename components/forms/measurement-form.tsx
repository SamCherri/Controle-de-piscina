'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveMeasurementAction } from '@/lib/actions';
import { evaluateMeasurement, statusMeta } from '@/lib/status';
import { cn } from '@/lib/utils';

type MeasurementFormProps = {
  poolId: string;
  tracksTemperature: boolean;
  idealRanges: {
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
  defaults?: {
    id?: string;
    measuredAt: string;
    responsibleName: string;
    chlorine: number;
    ph: number;
    alkalinity: number;
    hardness: number;
    temperature?: number | null;
    productsApplied: string;
    observations?: string | null;
    photoPath?: string | null;
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white">{pending ? 'Salvando...' : 'Salvar medição'}</button>;
}

function SubmitAndNewButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="intent" value="save_and_new" className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
      {pending ? 'Salvando...' : 'Salvar e lançar nova'}
    </button>
  );
}

function RangeHint({ min, max, unit }: { min: number; max: number; unit?: string }) {
  return <p className="text-xs text-slate-500">Faixa ideal: {min} a {max}{unit ? ` ${unit}` : ''}</p>;
}

export function MeasurementForm({ poolId, tracksTemperature, idealRanges, defaults }: MeasurementFormProps) {
  const [state, action] = useFormState(saveMeasurementAction, {});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    chlorine: defaults?.chlorine ?? 1.5,
    ph: defaults?.ph ?? 7.4,
    alkalinity: defaults?.alkalinity ?? 95,
    hardness: defaults?.hardness ?? 240,
    temperature: defaults?.temperature ?? 27
  });

  useEffect(() => () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
  }, [photoPreview]);

  const preview = useMemo(() => evaluateMeasurement({
    tracksTemperature,
    idealChlorineMin: idealRanges.idealChlorineMin,
    idealChlorineMax: idealRanges.idealChlorineMax,
    idealPhMin: idealRanges.idealPhMin,
    idealPhMax: idealRanges.idealPhMax,
    idealAlkalinityMin: idealRanges.idealAlkalinityMin,
    idealAlkalinityMax: idealRanges.idealAlkalinityMax,
    idealHardnessMin: idealRanges.idealHardnessMin,
    idealHardnessMax: idealRanges.idealHardnessMax,
    idealTemperatureMin: idealRanges.idealTemperatureMin ?? null,
    idealTemperatureMax: idealRanges.idealTemperatureMax ?? null
  }, draft), [draft, idealRanges, tracksTemperature]);

  const parameterCards = [
    { key: 'chlorine' as const, label: 'Cloro', unit: 'ppm', step: '0.1', min: idealRanges.idealChlorineMin, max: idealRanges.idealChlorineMax },
    { key: 'ph' as const, label: 'pH', unit: '', step: '0.1', min: idealRanges.idealPhMin, max: idealRanges.idealPhMax },
    { key: 'alkalinity' as const, label: 'Alcalinidade', unit: 'ppm', step: '0.1', min: idealRanges.idealAlkalinityMin, max: idealRanges.idealAlkalinityMax },
    { key: 'hardness' as const, label: 'Dureza cálcica', unit: 'ppm', step: '0.1', min: idealRanges.idealHardnessMin, max: idealRanges.idealHardnessMax }
  ];

  return (
    <form action={action} className="grid gap-5" encType="multipart/form-data">
      <input type="hidden" name="poolId" value={poolId} />
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      {defaults?.photoPath ? <input type="hidden" name="photoPath" value={defaults.photoPath} /> : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="card grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="measuredAt">Data e hora</label>
            <input id="measuredAt" name="measuredAt" type="datetime-local" defaultValue={defaults?.measuredAt} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="responsibleName">Responsável</label>
            <input id="responsibleName" name="responsibleName" defaultValue={defaults?.responsibleName} placeholder="Nome do zelador ou técnico" required />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="photo">Foto da piscina</label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={event => {
                const file = event.target.files?.[0];
                setPhotoPreview(previous => {
                  if (previous) {
                    URL.revokeObjectURL(previous);
                  }

                  return file ? URL.createObjectURL(file) : null;
                });
              }}
            />
            <p className="text-xs text-slate-500">No celular, o sistema prioriza a câmera traseira para agilizar evidências operacionais.</p>
            {photoPreview ? <Image src={photoPreview} alt="Pré-visualização da foto" width={1200} height={700} unoptimized className="h-40 w-full rounded-2xl object-cover" /> : null}
          </div>

          {parameterCards.map(item => {
            const evaluation = preview.parameters[item.key];
            const isOffRange = evaluation.status !== 'NORMAL';

            return (
              <div key={item.key} className="space-y-2">
                <label htmlFor={item.key}>{item.label}</label>
                <div className="relative">
                  <input
                    id={item.key}
                    name={item.key}
                    type="number"
                    step={item.step}
                    defaultValue={draft[item.key]}
                    required
                    onChange={event => setDraft(prev => ({ ...prev, [item.key]: Number(event.target.value) }))}
                    className={cn(isOffRange && 'border-amber-400 bg-amber-50')}
                  />
                  {item.unit ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{item.unit}</span> : null}
                </div>
                <RangeHint min={item.min} max={item.max} unit={item.unit} />
                {isOffRange ? <p className="text-xs text-amber-700">{evaluation.recommendedAction}</p> : null}
              </div>
            );
          })}

          {tracksTemperature ? (
            <div className="space-y-2">
              <label htmlFor="temperature">Temperatura da água</label>
              <div className="relative">
                <input
                  id="temperature"
                  name="temperature"
                  type="number"
                  step="0.1"
                  defaultValue={defaults?.temperature ?? 27}
                  required
                  onChange={event => setDraft(prev => ({ ...prev, temperature: Number(event.target.value) }))}
                  className={cn(preview.parameters.temperature.status !== 'NORMAL' && 'border-amber-400 bg-amber-50')}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">°C</span>
              </div>
              <RangeHint min={idealRanges.idealTemperatureMin ?? 24} max={idealRanges.idealTemperatureMax ?? 30} unit="°C" />
              {preview.parameters.temperature.status !== 'NORMAL' ? <p className="text-xs text-amber-700">{preview.parameters.temperature.recommendedAction}</p> : null}
            </div>
          ) : null}

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="productsApplied">Produtos aplicados</label>
            <textarea id="productsApplied" name="productsApplied" rows={3} defaultValue={defaults?.productsApplied} placeholder="Ex.: 200 g de cloro granulado + 100 ml de algicida" required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="observations">Observações</label>
            <textarea id="observations" name="observations" rows={3} defaultValue={defaults?.observations ?? ''} placeholder="Anote ocorrências, restrições e recomendações para a próxima ronda." />
          </div>
        </div>

        <aside className="card h-fit space-y-3">
          <p className="text-sm font-semibold text-slate-900">Prévia de status em tempo real</p>
          <div className={cn('rounded-xl border px-3 py-2 text-sm', statusMeta[preview.overallStatus].className)}>
            <p className="font-semibold">Status geral: {statusMeta[preview.overallStatus].label}</p>
            <p className="text-xs">{statusMeta[preview.overallStatus].message}</p>
          </div>
          {preview.recommendations.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-600">
              {preview.recommendations.map(item => <li key={item} className="rounded-lg bg-slate-50 p-2">{item}</li>)}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Sem desvios críticos no momento.</p>
          )}
        </aside>
      </div>

      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <SubmitAndNewButton />
        <SubmitButton />
      </div>
    </form>
  );
}
