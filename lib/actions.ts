'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authenticateUser, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/session';
import { computeMeasurementStatuses } from '@/lib/status';
import { prepareImageUpload } from '@/lib/uploads';
import { slugify } from '@/lib/utils';
import { condominiumSchema, loginSchema, measurementSchema, poolSchema } from '@/lib/validators';

export type ActionState = { success?: string; error?: string };

const INVALID_LOGIN_ERROR = 'E-mail ou senha inválidos.';

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) {
    return { error: INVALID_LOGIN_ERROR };
  }

  await createSession(user.id, user.email, user.name);
  redirect('/');
}

export async function createCondominiumAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const parsed = condominiumSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revise os dados do condomínio.' };
  }

  const slugBase = slugify(parsed.data.name);
  let slug = slugBase;
  let index = 1;
  while (await prisma.condominium.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${index++}`;
  }

  await prisma.condominium.create({ data: { ...parsed.data, slug } });
  revalidatePath('/');
  redirect('/');
}

export async function createPoolAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const parsed = poolSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revise os dados da piscina.' };
  }

  const slugBase = slugify(`${parsed.data.name}-${Date.now()}`);
  await prisma.pool.create({
    data: {
      ...parsed.data,
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

  const upload = await prepareImageUpload(photo);
  if (!upload.ok) {
    return { error: upload.error };
  }

  const hasNewPhoto = Boolean(upload.buffer && upload.mimeType);
  const photoPath = hasNewPhoto ? null : parsed.data.photoPath;
  const photoData = hasNewPhoto ? upload.buffer : undefined;
  const photoMimeType = hasNewPhoto ? upload.mimeType : undefined;
  const statuses = computeMeasurementStatuses(pool, parsed.data);

  if (parsed.data.id) {
    await prisma.measurement.update({
      where: { id: parsed.data.id },
      data: {
        ...parsed.data,
        measuredAt: new Date(parsed.data.measuredAt),
        photoPath,
        ...(hasNewPhoto ? { photoData, photoMimeType } : {}),
        ...statuses
      }
    });
  } else {
    await prisma.measurement.create({
      data: {
        ...parsed.data,
        measuredAt: new Date(parsed.data.measuredAt),
        photoPath,
        ...(hasNewPhoto ? { photoData, photoMimeType } : {}),
        ...statuses
      }
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
