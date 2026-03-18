import { z } from 'zod';

const optionalTrimmedString = z.preprocess(
  value => (typeof value === 'string' ? value.trim() || undefined : value),
  z.string().optional()
);

const requiredTrimmedString = (minimum: number, message: string) =>
  z.preprocess(
    value => (typeof value === 'string' ? value.trim() : value),
    z.string().min(minimum, message)
  );

const finiteNumber = (message: string) =>
  z.coerce.number({ invalid_type_error: message }).finite(message);

const boundedNumber = (label: string, minimum: number, maximum: number) =>
  finiteNumber(`Informe um valor numérico válido para ${label}.`).refine(
    value => value >= minimum && value <= maximum,
    `${label}: informe um valor entre ${minimum} e ${maximum}.`
  );

const nonNegativeNumber = (label: string, maximum: number) =>
  finiteNumber(`Informe um valor numérico válido para ${label}.`).refine(
    value => value >= 0 && value <= maximum,
    `${label}: informe um valor entre 0 e ${maximum}.`
  );

const orderedRange = <T extends Record<string, unknown>>(minField: keyof T, maxField: keyof T, label: string) =>
  (values: T, ctx: z.RefinementCtx) => {
    const min = values[minField];
    const max = values[maxField];

    if (typeof min !== 'number' || typeof max !== 'number') {
      return;
    }

    if (min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [String(maxField)],
        message: `${label}: o valor máximo deve ser maior ou igual ao mínimo.`
      });
    }
  };

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.')
});

export const condominiumSchema = z.object({
  name: requiredTrimmedString(3, 'Informe o nome do condomínio.'),
  address: optionalTrimmedString,
  contactName: optionalTrimmedString,
  contactPhone: optionalTrimmedString
});

export const poolSchema = z
  .object({
    condominiumId: z.string().min(1, 'Condomínio inválido.'),
    name: requiredTrimmedString(2, 'Informe o nome da piscina.'),
    description: optionalTrimmedString,
    locationNote: optionalTrimmedString,
    idealChlorineMin: boundedNumber('o cloro mínimo', 0, 20),
    idealChlorineMax: boundedNumber('o cloro máximo', 0, 20),
    idealPhMin: boundedNumber('o pH mínimo', 0, 14),
    idealPhMax: boundedNumber('o pH máximo', 0, 14),
    idealAlkalinityMin: nonNegativeNumber('a alcalinidade mínima', 1000),
    idealAlkalinityMax: nonNegativeNumber('a alcalinidade máxima', 1000),
    idealHardnessMin: nonNegativeNumber('a dureza mínima', 5000),
    idealHardnessMax: nonNegativeNumber('a dureza máxima', 5000),
    idealTemperatureMin: boundedNumber('a temperatura mínima', 0, 60),
    idealTemperatureMax: boundedNumber('a temperatura máxima', 0, 60)
  })
  .superRefine((data, ctx) => {
    orderedRange('idealChlorineMin', 'idealChlorineMax', 'Cloro')(data, ctx);
    orderedRange('idealPhMin', 'idealPhMax', 'pH')(data, ctx);
    orderedRange('idealAlkalinityMin', 'idealAlkalinityMax', 'Alcalinidade')(data, ctx);
    orderedRange('idealHardnessMin', 'idealHardnessMax', 'Dureza cálcica')(data, ctx);
    orderedRange('idealTemperatureMin', 'idealTemperatureMax', 'Temperatura')(data, ctx);
  });

export const measurementSchema = z.object({
  id: z.string().optional(),
  poolId: z.string().min(1, 'Piscina inválida.'),
  measuredAt: z.string().min(1, 'Informe a data e hora da medição.'),
  responsibleName: requiredTrimmedString(2, 'Informe o responsável pela medição.'),
  chlorine: boundedNumber('o cloro', 0, 20),
  ph: boundedNumber('o pH', 0, 14),
  alkalinity: nonNegativeNumber('a alcalinidade', 1000),
  hardness: nonNegativeNumber('a dureza cálcica', 5000),
  temperature: boundedNumber('a temperatura', 0, 60),
  productsApplied: requiredTrimmedString(2, 'Informe os produtos aplicados.'),
  observations: optionalTrimmedString,
  photoPath: optionalTrimmedString
});
