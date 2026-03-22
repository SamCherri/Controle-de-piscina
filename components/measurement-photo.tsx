'use client';

import { useEffect, useMemo, useState } from 'react';

type MeasurementPhotoProps = {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  fallbackClassName: string;
  emptyMessage?: string;
  missingMessage?: string;
  cacheKey?: string | number;
};

export function MeasurementPhoto({
  src,
  alt,
  width,
  height,
  className,
  fallbackClassName,
  emptyMessage = 'Sem foto recente disponível.',
  missingMessage = 'Não foi possível carregar a foto desta medição.',
  cacheKey
}: MeasurementPhotoProps) {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = useMemo(() => {
    if (!src) {
      return undefined;
    }

    if (cacheKey === undefined || cacheKey === null || cacheKey === '') {
      return src;
    }

    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}v=${encodeURIComponent(String(cacheKey))}`;
  }, [cacheKey, src]);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc) {
    return <div className={fallbackClassName}>{emptyMessage}</div>;
  }

  if (hasError) {
    return (
      <div className={fallbackClassName}>
        <div className="space-y-2">
          <p>{missingMessage}</p>
          <a
            href={resolvedSrc}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Abrir foto diretamente
          </a>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      decoding="async"
      loading="eager"
      fetchPriority="high"
      onError={() => setHasError(true)}
    />
  );
}
