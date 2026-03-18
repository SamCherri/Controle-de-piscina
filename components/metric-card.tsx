import { PoolStatus } from '@prisma/client';
import { StatusBadge } from '@/components/status-badge';
import { formatNumber } from '@/lib/utils';

export function MetricCard({
  label,
  value,
  unit,
  status,
  range
}: {
  label: string;
  value: number;
  unit: string;
  status: PoolStatus;
  range: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <StatusBadge status={status} />
      </div>
      <div className="text-3xl font-bold text-slate-900">
        {formatNumber(value)} <span className="text-base font-medium text-slate-500">{unit}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">Faixa ideal: {range}</p>
    </div>
  );
}
