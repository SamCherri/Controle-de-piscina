import { getMeasurementPhotoState, type MeasurementPhotoRecord } from '@/lib/uploads';

export type MeasurementPhotoSummaryRecord = MeasurementPhotoRecord & {
  measuredAt: Date;
  updatedAt: Date;
};

export function getLatestMeasurementWithPhoto<T extends MeasurementPhotoSummaryRecord>(measurements: T[]) {
  return measurements.find(measurement => getMeasurementPhotoState(measurement).kind !== 'missing');
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
