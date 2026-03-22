import {
  getMeasurementPhotoState,
  hasEmbeddedMeasurementPhoto,
  hasLegacyMeasurementPhoto,
  hasUsableMeasurementPhoto,
  normalizeLegacyPhotoPath,
  normalizeMimeType,
  type MeasurementPhotoRecord,
  type MeasurementPhotoState
} from '@/lib/uploads';

export type MeasurementPhotoSummaryRecord = MeasurementPhotoRecord & {
  measuredAt: Date;
  updatedAt: Date;
};

export type MeasurementPhotoDisplaySelection<T extends MeasurementPhotoSummaryRecord> = {
  latestMeasurement: T;
  latestMeasurementPhotoState: MeasurementPhotoState;
  photoMeasurement: T;
  photoMeasurementState: MeasurementPhotoState;
  usesFallback: boolean;
  fallbackReason?: string;
};

export function getLatestMeasurementWithPhoto<T extends MeasurementPhotoSummaryRecord>(measurements: T[]) {
  return measurements.find(measurement => hasUsableMeasurementPhoto(measurement));
}

export function selectMeasurementPhotoForDisplay<T extends MeasurementPhotoSummaryRecord>(measurements: T[]): MeasurementPhotoDisplaySelection<T> | null {
  const latestMeasurement = measurements[0];
  if (!latestMeasurement) {
    return null;
  }

  const latestMeasurementPhotoState = getMeasurementPhotoState(latestMeasurement);
  if (latestMeasurementPhotoState.kind !== 'missing') {
    return {
      latestMeasurement,
      latestMeasurementPhotoState,
      photoMeasurement: latestMeasurement,
      photoMeasurementState: latestMeasurementPhotoState,
      usesFallback: false
    };
  }

  const fallbackMeasurement = getLatestMeasurementWithPhoto(measurements.slice(1));
  if (!fallbackMeasurement) {
    return {
      latestMeasurement,
      latestMeasurementPhotoState,
      photoMeasurement: latestMeasurement,
      photoMeasurementState: latestMeasurementPhotoState,
      usesFallback: false
    };
  }

  const photoMeasurementState = getMeasurementPhotoState(fallbackMeasurement);
  return {
    latestMeasurement,
    latestMeasurementPhotoState,
    photoMeasurement: fallbackMeasurement,
    photoMeasurementState,
    usesFallback: true,
    fallbackReason: describeFallbackReason(latestMeasurement, fallbackMeasurement)
  };
}

export function getMeasurementPhotoRecencyMessage({
  latestMeasurement,
  photoMeasurement,
  formatter
}: {
  latestMeasurement: Pick<MeasurementPhotoSummaryRecord, 'measuredAt'>;
  photoMeasurement: Pick<MeasurementPhotoSummaryRecord, 'measuredAt'>;
  formatter: (value: Date) => string;
}) {
  if (latestMeasurement.measuredAt.getTime() === photoMeasurement.measuredAt.getTime()) {
    return undefined;
  }

  return `A foto exibida é da última medição com imagem disponível, registrada em ${formatter(photoMeasurement.measuredAt)}. A medição mais recente ainda não possui foto anexada.`;
}

export function describeMeasurementPhotoAvailability(measurement: MeasurementPhotoRecord) {
  if (hasEmbeddedMeasurementPhoto(measurement)) {
    return 'photoData válido no banco';
  }

  const normalizedMimeType = normalizeMimeType(measurement.photoMimeType);
  if (measurement.photoData && measurement.photoData.length > 0 && !normalizedMimeType) {
    return 'photoData existe, mas photoMimeType está ausente ou inválido';
  }

  const normalizedPhotoPath = normalizeLegacyPhotoPath(measurement.photoPath);
  if (normalizedPhotoPath) {
    return normalizedPhotoPath.startsWith('http') || normalizedPhotoPath.startsWith('data:')
      ? 'photoPath legado externo/data URL'
      : 'photoPath legado local';
  }

  return 'sem foto utilizável';
}

export function describeFallbackReason<T extends MeasurementPhotoSummaryRecord>(latestMeasurement: T, fallbackMeasurement: T) {
  return `A última medição (${latestMeasurement.id}) está sem foto utilizável; usando a foto mais recente disponível da medição ${fallbackMeasurement.id}.`;
}
