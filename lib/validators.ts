import { z } from 'zod';

const requiredTrimmedString = (field: string, min = 1) =>
  z.string().trim().min(min, `${field} é obrigatório.`);

const nonNegativeNumber = (field: string) =>
  z.coerce
    .number({ invalid_type_error: `${field} deve ser numérico.` })
    .finite(`${field} deve ser um número válido.`)
    .min(0, `${field} não pode ser negativo.`);

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.')
});

export const condominiumSchema = z.object({
  name: requiredTrimmedString('Nome do condomínio', 3),
  address: z.string().trim().max(300, 'O endereço deve ter no máximo 300 caracteres.').optional().or(z.literal('')),
  contactName: z.string().trim().max(120, 'O nome do contato deve ter no máximo 120 caracteres.').optional().or(z.literal('')),
  contactPhone: z.string().trim().max(40, 'O telefone deve ter no máximo 40 caracteres.').optional().or(z.literal(''))
});

const poolBaseSchema = z.object({
  condominiumId: requiredTrimmedString('Condomínio'),
  name: requiredTrimmedString('Nome da piscina', 2).max(120, 'O nome da piscina deve ter no máximo 120 caracteres.'),
  description: z.string().trim().max(300, 'A descrição deve ter no máximo 300 caracteres.').optional().or(z.literal('')),
  locationNote: z.string().trim().max(300, 'A observação de localização deve ter no máximo 300 caracteres.').optional().or(z.literal('')),
  idealChlorineMin: nonNegativeNumber('Cloro mínimo').max(20, 'Cloro mínimo fora da faixa plausível.'),
  idealChlorineMax: nonNegativeNumber('Cloro máximo').max(20, 'Cloro máximo fora da faixa plausível.'),
  idealPhMin: z.coerce.number().finite('pH mínimo deve ser válido.').min(0, 'pH mínimo não pode ser negativo.').max(14, 'pH mínimo deve estar entre 0 e 14.'),
  idealPhMax: z.coerce.number().finite('pH máximo deve ser válido.').min(0, 'pH máximo não pode ser negativo.').max(14, 'pH máximo deve estar entre 0 e 14.'),
  idealAlkalinityMin: nonNegativeNumber('Alcalinidade mínima').max(1000, 'Alcalinidade mínima fora da faixa plausível.'),
  idealAlkalinityMax: nonNegativeNumber('Alcalinidade máxima').max(1000, 'Alcalinidade máxima fora da faixa plausível.'),
  idealHardnessMin: nonNegativeNumber('Dureza mínima').max(5000, 'Dureza mínima fora da faixa plausível.'),
  idealHardnessMax: nonNegativeNumber('Dureza máxima').max(5000, 'Dureza máxima fora da faixa plausível.'),
  idealTemperatureMin: nonNegativeNumber('Temperatura mínima').max(60, 'Temperatura mínima fora da faixa plausível.'),
  idealTemperatureMax: nonNegativeNumber('Temperatura máxima').max(60, 'Temperatura máxima fora da faixa plausível.')
});

export const poolSchema = poolBaseSchema.superRefine((data, ctx) => {
  const ranges = [
    ['Cloro', data.idealChlorineMin, data.idealChlorineMax, 'idealChlorineMin'],
    ['pH', data.idealPhMin, data.idealPhMax, 'idealPhMin'],
    ['Alcalinidade', data.idealAlkalinityMin, data.idealAlkalinityMax, 'idealAlkalinityMin'],
    ['Dureza cálcica', data.idealHardnessMin, data.idealHardnessMax, 'idealHardnessMin'],
    ['Temperatura', data.idealTemperatureMin, data.idealTemperatureMax, 'idealTemperatureMin']
  ] as const;

  for (const [label, min, max, path] of ranges) {
    if (min >= max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label}: o valor mínimo deve ser menor que o máximo.`,
        path: [path]
      });
    }
  }

  if (data.idealTemperatureMax < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A temperatura máxima configurada está abaixo de uma faixa operacional plausível.',
      path: ['idealTemperatureMax']
    });
  }
});

const measurementDateSchema = z.string().min(1, 'Data e hora da medição é obrigatória.').refine(value => !Number.isNaN(Date.parse(value)), {
  message: 'Informe uma data e hora válidas.'
});

export const measurementSchema = z.object({
  id: z.string().trim().optional(),
  poolId: requiredTrimmedString('Piscina'),
  measuredAt: measurementDateSchema,
  responsibleName: requiredTrimmedString('Responsável', 2).max(120, 'O nome do responsável deve ter no máximo 120 caracteres.'),
  chlorine: nonNegativeNumber('Cloro').max(20, 'Cloro fora da faixa plausível para piscina.'),
  ph: z.coerce.number().finite('pH deve ser numérico.').min(0, 'pH não pode ser negativo.').max(14, 'pH deve estar entre 0 e 14.'),
  alkalinity: nonNegativeNumber('Alcalinidade').max(1000, 'Alcalinidade fora da faixa plausível.'),
  hardness: nonNegativeNumber('Dureza cálcica').max(5000, 'Dureza cálcica fora da faixa plausível.'),
  temperature: z.coerce.number().finite('Temperatura deve ser numérica.').min(0, 'Temperatura não pode ser negativa.').max(60, 'Temperatura fora da faixa plausível para piscina.'),
  productsApplied: requiredTrimmedString('Produtos aplicados', 2).max(1000, 'Produtos aplicados deve ter no máximo 1000 caracteres.'),
  observations: z.string().trim().max(2000, 'As observações devem ter no máximo 2000 caracteres.').optional().or(z.literal('')),
  photoPath: z.string().trim().max(255, 'Caminho da foto inválido.').optional().or(z.literal(''))
}).superRefine((data, ctx) => {
  const measuredAt = new Date(data.measuredAt);
  const now = Date.now();

  if (measuredAt.getTime() > now + 5 * 60 * 1000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A data da medição não pode estar no futuro.',
      path: ['measuredAt']
    });
  }

  if (data.temperature < 10 && data.chlorine > 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Os valores informados parecem inconsistentes para uma piscina em operação.',
      path: ['temperature']
    });
  }
});
