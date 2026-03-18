'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createSession, requireSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { condominiumSchema, loginSchema, measurementSchema, poolSchema } from '@/lib/validators';
import { slugify } from '@/lib/utils';
import { computeMeasurementStatuses } from '@/lib/status';
import { persistValidatedImageUpload, UploadValidationError } from '@/lib/upload';

export type ActionState = { success?: string; error?: string };

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Credenciais inválidas.' };
  }

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { error: 'Credenciais inválidas.' };

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return { error: 'Credenciais inválidas.' };

  await createSession(user.id, user.email, user.name);
  redirect('/');
}

export async function createCondominiumAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const parsed = condominiumSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revise os dados do condomínio.' };

  const slugBase = slugify(parsed.data.name);
  let slug = slugBase;
  let index = 1;
  while (await prisma.condominium.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${index++}`;
  }

  await prisma.condominium.create({
    data: {
      ...parsed.data,
      address: parsed.data.address || null,
      contactName: parsed.data.contactName || null,
      contactPhone: parsed.data.contactPhone || null,
      slug
    }
  });
  revalidatePath('/');
  redirect('/');
}

export async function createPoolAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const parsed = poolSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revise os dados da piscina.' };

  const slugBase = slugify(`${parsed.data.name}-${Date.now()}`);
  await prisma.pool.create({
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      locationNote: parsed.data.locationNote || null,
      slug: slugBase
    }
  });

  revalidatePath('/');
  redirect(`/condominios/${parsed.data.condominiumId}`);
}

export async function saveMeasurementAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const raw = Object.fromEntries(formData.entries());
  const photo = formData.get('photo') as File | null;
  const parsed = measurementSchema.safeParse({ ...raw, photoPath: raw.photoPath || undefined });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revise os dados da medição.' };
  }

  const pool = await prisma.pool.findUnique({ where: { id: parsed.data.poolId } });
  if (!pool) return { error: 'Piscina não encontrada.' };

  let photoPath = parsed.data.photoPath || null;
  if (photo && photo.size > 0) {
    try {
      const uploaded = await persistValidatedImageUpload(photo);
      photoPath = uploaded.path;
    } catch (error) {
      if (error instanceof UploadValidationError) {
        return { error: error.message };
      }
      throw error;
    }
  }

  const statuses = computeMeasurementStatuses(pool, parsed.data);
  const measurementData = {
    poolId: parsed.data.poolId,
    measuredAt: new Date(parsed.data.measuredAt),
    responsibleName: parsed.data.responsibleName,
    chlorine: parsed.data.chlorine,
    ph: parsed.data.ph,
    alkalinity: parsed.data.alkalinity,
    hardness: parsed.data.hardness,
    temperature: parsed.data.temperature,
    productsApplied: parsed.data.productsApplied,
    observations: parsed.data.observations || null,
    photoPath,
    ...statuses
  };

  if (parsed.data.id) {
    await prisma.measurement.update({
      where: { id: parsed.data.id },
      data: measurementData
    });
  } else {
    await prisma.measurement.create({
      data: measurementData
    });
  }

  revalidatePath('/');
  revalidatePath(`/condominios/${pool.condominiumId}/piscinas/${pool.id}`);
  revalidatePath(`/public/piscinas/${pool.slug}`);
  redirect(`/condominios/${pool.condominiumId}/piscinas/${pool.id}`);
}

export async function deleteMeasurementAction(formData: FormData) {
  await requireSession();

  const measurementId = String(formData.get('measurementId'));
  const poolId = String(formData.get('poolId'));
  const condominiumId = String(formData.get('condominiumId'));
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  await prisma.measurement.delete({ where: { id: measurementId } });
  revalidatePath(`/condominios/${condominiumId}/piscinas/${poolId}`);
  if (pool) revalidatePath(`/public/piscinas/${pool.slug}`);
}
