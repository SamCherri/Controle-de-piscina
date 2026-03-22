type PhotoStorageAlertProps = {
  message: string;
  tone?: 'warning' | 'info';
};

export function PhotoStorageAlert({ message, tone = 'warning' }: PhotoStorageAlertProps) {
  const styles =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-sky-200 bg-sky-50 text-sky-900';

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${styles}`}>
      <strong className="font-semibold">Atenção com a foto:</strong> {message}
    </div>
  );
}
