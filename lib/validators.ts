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

const orderedRange = (minField: string, maxField: string, label: string) =>
  ({ [minField]: min, [maxField]: max }: Record<string, number>, ctx: z.RefinementCtx) => {
    if (min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [maxField],
        message: `${label}: o valor máximo deve ser maior ou igual ao mínimo.`
      });
    }
  };

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
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
    idealChlorineMin: finiteNumber('Informe um valor numérico válido para o cloro mínimo.'),
    idealChlorineMax: finiteNumber('Informe um valor numérico válido para o cloro máximo.'),
    idealPhMin: finiteNumber('Informe um valor numérico válido para o pH mínimo.'),
    idealPhMax: finiteNumber('Informe um valor numérico válido para o pH máximo.'),
    idealAlkalinityMin: finiteNumber('Informe um valor numérico válido para a alcalinidade mínima.'),
    idealAlkalinityMax: finiteNumber('Informe um valor numérico válido para a alcalinidade máxima.'),
    idealHardnessMin: finiteNumber('Informe um valor numérico válido para a dureza mínima.'),
    idealHardnessMax: finiteNumber('Informe um valor numérico válido para a dureza máxima.'),
    idealTemperatureMin: finiteNumber('Informe um valor numérico válido para a temperatura mínima.'),
    idealTemperatureMax: finiteNumber('Informe um valor numérico válido para a temperatura máxima.')
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
  chlorine: finiteNumber('Informe um valor numérico válido para o cloro.'),
  ph: finiteNumber('Informe um valor numérico válido para o pH.'),
  alkalinity: finiteNumber('Informe um valor numérico válido para a alcalinidade.'),
  hardness: finiteNumber('Informe um valor numérico válido para a dureza cálcica.'),
  temperature: finiteNumber('Informe um valor numérico válido para a temperatura.'),
  productsApplied: requiredTrimmedString(2, 'Informe os produtos aplicados.'),
  observations: optionalTrimmedString,
  photoPath: optionalTrimmedString
});
