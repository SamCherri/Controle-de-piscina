import Link from 'next/link';

export function PageHeader({
  title,
  description,
  actionLabel,
  actionHref
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white shadow-soft sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-brand-100">Controle operacional</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-50/90">{description}</p>
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-brand-700">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
