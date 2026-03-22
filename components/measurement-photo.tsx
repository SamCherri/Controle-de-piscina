'use client';

import { useState } from 'react';
import Image from 'next/image';

type MeasurementPhotoProps = {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  fallbackClassName: string;
  emptyMessage?: string;
  missingMessage?: string;
};

export function MeasurementPhoto({
  src,
  alt,
  width,
  height,
  className,
  fallbackClassName,
  emptyMessage = 'Sem foto recente disponível.',
  missingMessage = 'A foto anexada não está mais disponível neste ambiente.'
}: MeasurementPhotoProps) {
  const [hasError, setHasError] = useState(false);

  if (!src) {
    return <div className={fallbackClassName}>{emptyMessage}</div>;
  }

  if (hasError) {
    return <div className={fallbackClassName}>{missingMessage}</div>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
