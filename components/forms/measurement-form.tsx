'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveMeasurementAction } from '@/lib/actions';

type MeasurementFormProps = {
  poolId: string;
  defaults?: {
    id?: string;
    measuredAt: string;
    responsibleName: string;
    chlorine: number;
    ph: number;
    alkalinity: number;
    hardness: number;
    temperature: number;
    productsApplied: string;
    observations?: string | null;
    photoPath?: string | null;
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white">{pending ? 'Salvando...' : 'Salvar medição'}</button>;
}

export function MeasurementForm({ poolId, defaults }: MeasurementFormProps) {
  const [state, action] = useFormState(saveMeasurementAction, {});

  return (
    <form action={action} className="grid gap-5" encType="multipart/form-data">
      <input type="hidden" name="poolId" value={poolId} />
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      {defaults?.photoPath ? <input type="hidden" name="photoPath" value={defaults.photoPath} /> : null}
      <div className="card grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="measuredAt">Data e hora</label>
          <input id="measuredAt" name="measuredAt" type="datetime-local" defaultValue={defaults?.measuredAt} required />
        </div>
        <div className="space-y-2">
          <label htmlFor="responsibleName">Responsável</label>
          <input id="responsibleName" name="responsibleName" defaultValue={defaults?.responsibleName} placeholder="Nome do zelador ou técnico" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="photo">Foto da piscina</label>
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" />
          <p className="text-xs text-slate-500">No celular, o sistema prioriza a câmera traseira. A foto é enviada para o servidor para aparecer no QR code e na página pública em outros aparelhos.</p>
        </div>
        {[
          ['chlorine', 'Cloro', defaults?.chlorine ?? 1.5],
          ['ph', 'pH', defaults?.ph ?? 7.4],
          ['alkalinity', 'Alcalinidade', defaults?.alkalinity ?? 95],
          ['hardness', 'Dureza cálcica', defaults?.hardness ?? 240],
          ['temperature', 'Temperatura da água', defaults?.temperature ?? 27]
        ].map(([name, label, value]) => (
          <div key={name as string} className="space-y-2">
            <label htmlFor={name as string}>{label as string}</label>
            <input id={name as string} name={name as string} type="number" step="0.1" defaultValue={value as number} required />
          </div>
        ))}
        <div className="space-y-2 md:col-span-2 xl:col-span-3">
          <label htmlFor="productsApplied">Produtos aplicados</label>
          <textarea id="productsApplied" name="productsApplied" rows={3} defaultValue={defaults?.productsApplied} placeholder="Ex.: 200 g de cloro granulado + 100 ml de algicida" required />
        </div>
        <div className="space-y-2 md:col-span-2 xl:col-span-3">
          <label htmlFor="observations">Observações</label>
          <textarea id="observations" name="observations" rows={3} defaultValue={defaults?.observations ?? ''} placeholder="Anote quaisquer observações sobre a água, bordas, equipamentos ou restrições de uso." />
        </div>
      </div>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <div className="flex justify-end"><SubmitButton /></div>
    </form>
  );
}
