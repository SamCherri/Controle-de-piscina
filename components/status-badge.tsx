import { PoolStatus } from '@prisma/client';
import { cn } from '@/lib/utils';
import { statusMeta } from '@/lib/status';

export function StatusBadge({ status }: { status: PoolStatus }) {
  const meta = statusMeta[status];
  return <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', meta.className)}>{meta.label}</span>;
}
