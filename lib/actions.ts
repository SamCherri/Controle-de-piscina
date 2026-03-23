'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { changePassword, authenticateUser, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveMeasurementPhotoPersistence } from '@/lib/measurement-photo-persistence';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/session';
import { computeMeasurementStatuses } from '@/lib/status';
import { prepareImageUpload, toPrismaBytes } from '@/lib/uploads';
import { slugify } from '@/lib/utils';
import {
  changePasswordSchema,
  condominiumSchema,
  forgotPasswordSchema,
  loginSchema,
  measurementSchema,
  poolSchema,
  resetPasswordSchema
} from '@/lib/validators';
import { getCurrentRequestMetadata } from '@/lib/auth/utils';
import { requestPasswordReset, consumePasswordResetToken } from '@/lib/auth/password-reset';

export type ActionState = { success?: string; error?: string; info?: string; resetUrlPreview?: string };

const INVALID_LOGIN_ERROR = 'E-mail ou senha inválidos.';
const ACCOUNT_LOCKED_ERROR = 'Muitas tentativas inválidas. Tente novamente mais tarde.';

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const authResult = await authenticateUser(parsed.data.email, parsed.data.password, getCurrentRequestMetadata());
  if (!authResult.ok) {
    return { error: authResult.error === 'ACCOUNT_LOCKED' ? ACCOUNT_LOCKED_ERROR : INVALID_LOGIN_ERROR };
  }

  await createSession({
    userId: authResult.user.id,
    email: authResult.user.email,
    name: authResult.user.name,
    mustChangePassword: authResult.requiresPasswordChange
  });

  redirect(authResult.requiresPasswordChange ? '/trocar-senha-obrigatoria' : '/');
}

export async function requestPasswordResetAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const result = await requestPasswordReset(parsed.data.email, getCurrentRequestMetadata());

  return {
    success: result.message,
    resetUrlPreview: result.resetUrlPreview
  };
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const result = await consumePasswordResetToken(parsed.data.token, passwordHash, getCurrentRequestMetadata());

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
}

export async function forcePasswordChangeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSession();

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { error: 'Senha atual inválida.' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await changePassword(user.id, passwordHash, getCurrentRequestMetadata());
  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    mustChangePassword: false
  });

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

  const existingMeasurement = parsed.data.id
    ? await prisma.measurement.findUnique({
        where: { id: parsed.data.id },
        select: {
          id: true,
          poolId: true,
          photoData: true,
          photoMimeType: true,
          photoPath: true
        }
      })
    : null;
  if (parsed.data.id && (!existingMeasurement || existingMeasurement.poolId !== parsed.data.poolId)) {
    return { error: 'Medição não encontrada.' };
  }

  const upload = await prepareImageUpload(photo);
  if (!upload.ok) {
    return { error: upload.error };
  }

  const photoPersistence = await resolveMeasurementPhotoPersistence({
    photoPath: parsed.data.photoPath,
    upload,
    onRecoveryFailure: parsed.data.id ? 'preserve-legacy-path' : 'error'
  });
  if (!photoPersistence.ok) {
    return { error: photoPersistence.error };
  }

  const statuses = computeMeasurementStatuses(pool, parsed.data);

  const hasNewUpload = Boolean(upload.buffer && upload.mimeType);
  const shouldPreserveExistingPhoto = Boolean(existingMeasurement && !hasNewUpload && !parsed.data.photoPath);
  const photoFields = photoPersistence.kind === 'embedded'
    ? {
        photoData: toPrismaBytes(photoPersistence.photoData),
        photoMimeType: photoPersistence.photoMimeType,
        photoPath: null
      }
    : photoPersistence.kind === 'preserved-legacy'
      ? {
          photoData: existingMeasurement?.photoData ?? null,
          photoMimeType: existingMeasurement?.photoMimeType ?? null,
          photoPath: photoPersistence.photoPath
        }
      : shouldPreserveExistingPhoto
        ? {
            photoData: existingMeasurement?.photoData ?? null,
            photoMimeType: existingMeasurement?.photoMimeType ?? null,
            photoPath: existingMeasurement?.photoPath ?? null
          }
        : {
            photoData: null,
            photoMimeType: null,
            photoPath: null
          };

  if (parsed.data.id) {
    await prisma.measurement.update({
      where: { id: parsed.data.id },
      data: {
        ...parsed.data,
        measuredAt: new Date(parsed.data.measuredAt),
        ...photoFields,
        ...statuses
      }
    });
  } else {
    await prisma.measurement.create({
      data: {
        ...parsed.data,
        measuredAt: new Date(parsed.data.measuredAt),
        ...photoFields,
        ...statuses
      }
    });
  }

  revalidatePath('/');
  revalidatePath(`/condominios/${pool.condominiumId}/piscinas/${pool.id}`);
  revalidatePath(`/debug/fotos`);
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
  revalidatePath(`/debug/fotos`);
  if (pool) revalidatePath(`/public/piscinas/${pool.slug}`);
}
