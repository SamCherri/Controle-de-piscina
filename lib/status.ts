import { Pool, PoolStatus } from '@prisma/client';

export type MeasurementInput = {
  chlorine: number;
  ph: number;
  alkalinity: number;
  hardness: number;
  temperature?: number | null;
};

export type PoolProfile = 'STANDARD' | 'CHILDREN' | 'HEATED' | 'INDOOR';
export type WaterParameter = 'chlorine' | 'ph' | 'alkalinity' | 'hardness' | 'temperature';

type ParameterSeverityConfig = {
  attentionDeltaRatio: number;
  criticalDeltaRatio: number;
  lowActions: { attention: string; critical: string };
  highActions: { attention: string; critical: string };
};

export type ParameterEvaluation = {
  parameter: WaterParameter;
  label: string;
  value: number;
  min: number;
  max: number;
  status: PoolStatus;
  deviationDirection: 'LOW' | 'HIGH' | 'NONE';
  recommendedAction: string | null;
  helperText: string;
  unit: string;
};

const PARAMETER_META: Record<WaterParameter, { label: string; unit: string }> = {
  chlorine: { label: 'Cloro livre', unit: 'ppm' },
  ph: { label: 'pH', unit: '' },
  alkalinity: { label: 'Alcalinidade total', unit: 'ppm' },
  hardness: { label: 'Dureza cálcica', unit: 'ppm' },
  temperature: { label: 'Temperatura', unit: '°C' }
};

const STATUS_CONFIG: Record<WaterParameter, ParameterSeverityConfig> = {
  chlorine: {
    attentionDeltaRatio: 0.2,
    criticalDeltaRatio: 0.45,
    lowActions: {
      attention: 'Ajustar dosagem de cloro gradualmente e repetir leitura em até 2 horas.',
      critical: 'Aplicar cloração corretiva imediata e restringir uso até normalização.'
    },
    highActions: {
      attention: 'Reduzir aplicação de cloro e monitorar dissipação natural do residual.',
      critical: 'Suspender banho imediatamente e corrigir excesso de cloro com procedimento técnico.'
    }
  },
  ph: {
    attentionDeltaRatio: 0.12,
    criticalDeltaRatio: 0.24,
    lowActions: {
      attention: 'Aplicar elevador de pH em pequenas doses e recircular a água.',
      critical: 'Corrigir pH com urgência antes de liberar a piscina para uso.'
    },
    highActions: {
      attention: 'Aplicar redutor de pH em dose fracionada e reavaliar em seguida.',
      critical: 'Executar correção imediata de pH para evitar irritação e baixa eficiência do cloro.'
    }
  },
  alkalinity: {
    attentionDeltaRatio: 0.2,
    criticalDeltaRatio: 0.4,
    lowActions: {
      attention: 'Adicionar elevador de alcalinidade e revisar estabilidade do pH.',
      critical: 'Executar correção estrutural da alcalinidade antes da próxima operação.'
    },
    highActions: {
      attention: 'Reduzir alcalinidade com ajuste químico controlado.',
      critical: 'Corrigir excesso de alcalinidade para evitar incrustações e água turva.'
    }
  },
  hardness: {
    attentionDeltaRatio: 0.15,
    criticalDeltaRatio: 0.35,
    lowActions: {
      attention: 'Reforçar dureza com ajuste gradual para proteger superfícies e equipamentos.',
      critical: 'Corrigir baixa dureza com prioridade para prevenir corrosão acelerada.'
    },
    highActions: {
      attention: 'Reavaliar fonte de reposição e controlar dureza para evitar incrustações.',
      critical: 'Tratar excesso de dureza imediatamente para proteger tubulações e aquecimento.'
    }
  },
  temperature: {
    attentionDeltaRatio: 0.18,
    criticalDeltaRatio: 0.32,
    lowActions: {
      attention: 'Ajustar operação do aquecimento para faixa de conforto e segurança.',
      critical: 'Elevar temperatura para faixa operacional antes do uso intenso.'
    },
    highActions: {
      attention: 'Reduzir aquecimento e aumentar circulação para dissipar calor.',
      critical: 'Suspender aquecimento e priorizar resfriamento para evitar desconforto térmico.'
    }
  }
};

function normalizeRange(min: number, max: number) {
  if (max > min) {
    return { min, max, span: max - min };
  }

  return { min, max: min, span: 1 };
}

export function evaluateParameterStatus(parameter: WaterParameter, value: number, min: number, max: number): ParameterEvaluation {
  const { label, unit } = PARAMETER_META[parameter];
  const rules = STATUS_CONFIG[parameter];
  const normalized = normalizeRange(min, max);

  if (value >= normalized.min && value <= normalized.max) {
    return {
      parameter,
      label,
      value,
      min: normalized.min,
      max: normalized.max,
      status: 'NORMAL',
      deviationDirection: 'NONE',
      recommendedAction: null,
      helperText: `${label} dentro da faixa ideal.`,
      unit
    };
  }

  const isLow = value < normalized.min;
  const delta = isLow ? normalized.min - value : value - normalized.max;
  const ratio = delta / normalized.span;

  const status: PoolStatus = ratio >= rules.criticalDeltaRatio ? 'CRITICAL' : 'ATTENTION';
  const action = isLow
    ? status === 'CRITICAL'
      ? rules.lowActions.critical
      : rules.lowActions.attention
    : status === 'CRITICAL'
      ? rules.highActions.critical
      : rules.highActions.attention;

  return {
    parameter,
    label,
    value,
    min: normalized.min,
    max: normalized.max,
    status,
    deviationDirection: isLow ? 'LOW' : 'HIGH',
    recommendedAction: action,
    helperText: isLow ? `${label} abaixo da faixa recomendada.` : `${label} acima da faixa recomendada.`,
    unit
  };
}

function getOverallStatus(statuses: PoolStatus[]): PoolStatus {
  if (statuses.includes('CRITICAL')) return 'CRITICAL';
  if (statuses.includes('ATTENTION')) return 'ATTENTION';
  return 'NORMAL';
}

export function evaluateMeasurement(pool: Pick<Pool, 'tracksTemperature' | 'idealChlorineMin' | 'idealChlorineMax' | 'idealPhMin' | 'idealPhMax' | 'idealAlkalinityMin' | 'idealAlkalinityMax' | 'idealHardnessMin' | 'idealHardnessMax' | 'idealTemperatureMin' | 'idealTemperatureMax'>, values: MeasurementInput) {
  const chlorine = evaluateParameterStatus('chlorine', values.chlorine, pool.idealChlorineMin, pool.idealChlorineMax);
  const ph = evaluateParameterStatus('ph', values.ph, pool.idealPhMin, pool.idealPhMax);
  const alkalinity = evaluateParameterStatus('alkalinity', values.alkalinity, pool.idealAlkalinityMin, pool.idealAlkalinityMax);
  const hardness = evaluateParameterStatus('hardness', values.hardness, pool.idealHardnessMin, pool.idealHardnessMax);

  const canEvaluateTemperature = pool.tracksTemperature
    && typeof values.temperature === 'number'
    && typeof pool.idealTemperatureMin === 'number'
    && typeof pool.idealTemperatureMax === 'number';

  const temperature = canEvaluateTemperature
    ? evaluateParameterStatus('temperature', values.temperature as number, pool.idealTemperatureMin as number, pool.idealTemperatureMax as number)
    : {
        parameter: 'temperature' as const,
        label: PARAMETER_META.temperature.label,
        value: typeof values.temperature === 'number' ? values.temperature : Number.NaN,
        min: typeof pool.idealTemperatureMin === 'number' ? pool.idealTemperatureMin : Number.NaN,
        max: typeof pool.idealTemperatureMax === 'number' ? pool.idealTemperatureMax : Number.NaN,
        status: 'NORMAL' as PoolStatus,
        deviationDirection: 'NONE' as const,
        recommendedAction: null,
        helperText: 'Temperatura sem monitoramento ativo.',
        unit: PARAMETER_META.temperature.unit
      };

  const statuses = [chlorine.status, ph.status, alkalinity.status, hardness.status, ...(pool.tracksTemperature ? [temperature.status] : [])];
  const overallStatus = getOverallStatus(statuses);
  const recommendations = [chlorine, ph, alkalinity, hardness, ...(pool.tracksTemperature ? [temperature] : [])]
    .filter(item => item.status !== 'NORMAL' && item.recommendedAction)
    .map(item => `${item.label}: ${item.recommendedAction}`);

  return {
    overallStatus,
    recommendations,
    parameters: {
      chlorine,
      ph,
      alkalinity,
      hardness,
      temperature
    }
  };
}

export function computeMeasurementStatuses(pool: Pick<Pool, 'tracksTemperature' | 'idealChlorineMin' | 'idealChlorineMax' | 'idealPhMin' | 'idealPhMax' | 'idealAlkalinityMin' | 'idealAlkalinityMax' | 'idealHardnessMin' | 'idealHardnessMax' | 'idealTemperatureMin' | 'idealTemperatureMax'>, values: MeasurementInput) {
  const evaluation = evaluateMeasurement(pool, values);

  return {
    chlorineStatus: evaluation.parameters.chlorine.status,
    phStatus: evaluation.parameters.ph.status,
    alkalinityStatus: evaluation.parameters.alkalinity.status,
    hardnessStatus: evaluation.parameters.hardness.status,
    temperatureStatus: evaluation.parameters.temperature.status,
    overallStatus: evaluation.overallStatus
  };
}

export function getStatusSummaryMessage(status: PoolStatus) {
  if (status === 'CRITICAL') return 'Condição crítica: intervenção imediata recomendada.';
  if (status === 'ATTENTION') return 'Condição em atenção: ajuste preventivo recomendado.';
  return 'Condição estável: parâmetros dentro da meta operacional.';
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
    message: 'Existe desvio controlável. Recomenda-se ajuste operacional.'
  },
  CRITICAL: {
    label: 'Crítico',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
    message: 'Parâmetros críticos. Ação corretiva imediata é recomendada.'
  }
};
