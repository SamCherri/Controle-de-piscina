import { PoolStatus, Pool } from '@prisma/client';

export type MeasurementInput = {
  chlorine: number;
  ph: number;
  alkalinity: number;
  hardness: number;
  temperature?: number | null;
};

function evaluateParameter(value: number, min: number, max: number): PoolStatus {
  const range = max - min;
  const tolerance = range * 0.15;

  if (value >= min && value <= max) return 'NORMAL';
  if (value >= min - tolerance && value <= max + tolerance) return 'ATTENTION';
  return 'CRITICAL';
}

export function computeMeasurementStatuses(pool: Pick<Pool, 'tracksTemperature' | 'idealChlorineMin' | 'idealChlorineMax' | 'idealPhMin' | 'idealPhMax' | 'idealAlkalinityMin' | 'idealAlkalinityMax' | 'idealHardnessMin' | 'idealHardnessMax' | 'idealTemperatureMin' | 'idealTemperatureMax'>, values: MeasurementInput) {
  const chlorineStatus = evaluateParameter(values.chlorine, pool.idealChlorineMin, pool.idealChlorineMax);
  const phStatus = evaluateParameter(values.ph, pool.idealPhMin, pool.idealPhMax);
  const alkalinityStatus = evaluateParameter(values.alkalinity, pool.idealAlkalinityMin, pool.idealAlkalinityMax);
  const hardnessStatus = evaluateParameter(values.hardness, pool.idealHardnessMin, pool.idealHardnessMax);

  const canEvaluateTemperature = pool.tracksTemperature
    && typeof values.temperature === 'number'
    && typeof pool.idealTemperatureMin === 'number'
    && typeof pool.idealTemperatureMax === 'number';

  const temperatureValue = typeof values.temperature === 'number' ? values.temperature : null;
  const temperatureMin = typeof pool.idealTemperatureMin === 'number' ? pool.idealTemperatureMin : null;
  const temperatureMax = typeof pool.idealTemperatureMax === 'number' ? pool.idealTemperatureMax : null;

  const temperatureStatus = canEvaluateTemperature && temperatureValue !== null && temperatureMin !== null && temperatureMax !== null
    ? evaluateParameter(temperatureValue, temperatureMin, temperatureMax)
    : 'NORMAL';

  const statuses = [chlorineStatus, phStatus, alkalinityStatus, hardnessStatus, ...(pool.tracksTemperature ? [temperatureStatus] : [])];

  const overallStatus: PoolStatus = statuses.includes('CRITICAL')
    ? 'CRITICAL'
    : statuses.includes('ATTENTION')
      ? 'ATTENTION'
      : 'NORMAL';

  return {
    chlorineStatus,
    phStatus,
    alkalinityStatus,
    hardnessStatus,
    temperatureStatus,
    overallStatus
  };
}

export const statusMeta: Record<PoolStatus, { label: string; className: string; message: string }> = {
  NORMAL: {
    label: 'Normal',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    message: 'Parâmetros dentro das faixas ideais.'
  },
  ATTENTION: {
    label: 'Atenção',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    message: 'Existe desvio leve: recomenda-se nova conferência e ajuste.'
  },
  CRITICAL: {
    label: 'Crítico',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
    message: 'Parâmetros críticos: ação corretiva imediata recomendada.'
  }
};
