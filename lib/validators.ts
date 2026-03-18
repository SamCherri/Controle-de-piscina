import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.')
});

export const condominiumSchema = z.object({
  name: z.string().min(3),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional()
});

export const poolSchema = z.object({
  condominiumId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  locationNote: z.string().optional(),
  idealChlorineMin: z.coerce.number(),
  idealChlorineMax: z.coerce.number(),
  idealPhMin: z.coerce.number(),
  idealPhMax: z.coerce.number(),
  idealAlkalinityMin: z.coerce.number(),
  idealAlkalinityMax: z.coerce.number(),
  idealHardnessMin: z.coerce.number(),
  idealHardnessMax: z.coerce.number(),
  idealTemperatureMin: z.coerce.number(),
  idealTemperatureMax: z.coerce.number()
});

export const measurementSchema = z.object({
  id: z.string().optional(),
  poolId: z.string().min(1),
  measuredAt: z.string().min(1),
  responsibleName: z.string().min(2),
  chlorine: z.coerce.number(),
  ph: z.coerce.number(),
  alkalinity: z.coerce.number(),
  hardness: z.coerce.number(),
  temperature: z.coerce.number(),
  productsApplied: z.string().min(2),
  observations: z.string().optional(),
  photoPath: z.string().optional()
});
