'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { changePassword, authenticateUser, requireAdminSession, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveMeasurementPhotoPersistence } from '@/lib/measurement-photo-persistence';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/session';
import { computeMeasurementStatuses } from '@/lib/status';
import { prepareImageUpload, toPrismaBytes } from '@/lib/uploads';
import { slugify } from '@/lib/utils';
import { validateAdminUserDeletion, validateAdminUserRoleChange } from '@/lib/auth/admin-user-guards';
import {
  changePasswordSchema,
  createAdminUserSchema,
  deleteAdminUserSchema,
  condominiumSchema,
  forgotPasswordSchema,
  loginSchema,
  measurementSchema,
  resetAdminUserPasswordSchema,
  poolSchema,
  updatePoolSchema,
  updateAdminUserSchema,
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



export async function createAdminUserAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminSession();

  const parsed = createAdminUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const existingUser = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return { error: 'Já existe um usuário com este e-mail.' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.adminUser.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      mustChangePassword: false
    }
  });

  revalidatePath('/usuarios');
  redirect('/usuarios');
}

export async function updateAdminUserAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const currentUser = await requireAdminSession();

  const parsed = updateAdminUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const targetUser = await prisma.adminUser.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true, email: true }
  });
  if (!targetUser) {
    return { error: 'Usuário não encontrado.' };
  }

  const conflictingUser = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (conflictingUser && conflictingUser.id !== parsed.data.userId) {
    return { error: 'Já existe um usuário com este e-mail.' };
  }

  const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } });
  const roleChangeError = validateAdminUserRoleChange({
    targetUserId: parsed.data.userId,
    currentUserId: currentUser.id,
    currentRole: targetUser.role,
    nextRole: parsed.data.role,
    adminCount
  });
  if (roleChangeError) {
    return { error: roleChangeError };
  }

  await prisma.adminUser.update({
    where: { id: parsed.data.userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role
    }
  });

  revalidatePath('/usuarios');
  redirect('/usuarios');
}

export async function resetAdminUserPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminSession();

  const parsed = resetAdminUserPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const user = await prisma.adminUser.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return { error: 'Usuário não encontrado.' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.adminUser.update({
    where: { id: parsed.data.userId },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      mustChangePassword: true
    }
  });

  revalidatePath('/usuarios');
  redirect('/usuarios');
}

export async function deleteAdminUserAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const currentUser = await requireAdminSession();

  const parsed = deleteAdminUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true }
  });
  if (!user) {
    return { error: 'Usuário não encontrado.' };
  }

  const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } });
  const deletionError = validateAdminUserDeletion({
    targetUserId: user.id,
    currentUserId: currentUser.id,
    targetRole: user.role,
    adminCount
  });
  if (deletionError) {
    return { error: deletionError };
  }

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.authAuditLog.updateMany({ where: { userId: user.id }, data: { userId: null } });
  await prisma.adminUser.delete({ where: { id: user.id } });

  revalidatePath('/usuarios');
  redirect('/usuarios');
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

  const coverPhoto = formData.get('coverPhoto') as File | null;
  const upload = await prepareImageUpload(coverPhoto);
  if (!upload.ok) {
    return { error: upload.error };
  }

  const slugBase = slugify(parsed.data.name);
  let slug = slugBase;
  let index = 1;
  while (await prisma.pool.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${index++}`;
  }

  const createdPool = await prisma.pool.create({
    data: {
      ...parsed.data,
      slug,
      idealTemperatureMin: parsed.data.tracksTemperature ? parsed.data.idealTemperatureMin : null,
      idealTemperatureMax: parsed.data.tracksTemperature ? parsed.data.idealTemperatureMax : null,
      coverPhotoData: upload.buffer ? toPrismaBytes(upload.buffer) : null,
      coverPhotoMimeType: upload.mimeType ?? null
    }
  });

  revalidatePath('/');
  revalidatePath(`/public/piscinas/${createdPool.slug}`);
  redirect(`/condominios/${parsed.data.condominiumId}`);
}

export async function updatePoolAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminSession();

  const parsed = updatePoolSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revise os dados da piscina.' };
  }

  const existingPool = await prisma.pool.findUnique({
    where: { id: parsed.data.poolId },
    select: { id: true, condominiumId: true }
  });

  if (!existingPool || existingPool.condominiumId !== parsed.data.condominiumId) {
    return { error: 'Piscina não encontrada.' };
  }

  const coverPhoto = formData.get('coverPhoto') as File | null;
  const upload = await prepareImageUpload(coverPhoto);
  if (!upload.ok) {
    return { error: upload.error };
  }

  const updatedPool = await prisma.$transaction(async tx => {
    const pool = await tx.pool.update({
      where: { id: parsed.data.poolId },
      data: {
        condominiumId: parsed.data.condominiumId,
        name: parsed.data.name,
        description: parsed.data.description,
        locationNote: parsed.data.locationNote,
        idealChlorineMin: parsed.data.idealChlorineMin,
        idealChlorineMax: parsed.data.idealChlorineMax,
        idealPhMin: parsed.data.idealPhMin,
        idealPhMax: parsed.data.idealPhMax,
        idealAlkalinityMin: parsed.data.idealAlkalinityMin,
        idealAlkalinityMax: parsed.data.idealAlkalinityMax,
        idealHardnessMin: parsed.data.idealHardnessMin,
        idealHardnessMax: parsed.data.idealHardnessMax,
        tracksTemperature: parsed.data.tracksTemperature,
        idealTemperatureMin: parsed.data.tracksTemperature ? parsed.data.idealTemperatureMin : null,
        idealTemperatureMax: parsed.data.tracksTemperature ? parsed.data.idealTemperatureMax : null,
        ...(upload.buffer && upload.mimeType
          ? {
              coverPhotoData: toPrismaBytes(upload.buffer),
              coverPhotoMimeType: upload.mimeType
            }
          : {})
      }
    });

    const measurements = await tx.measurement.findMany({
      where: { poolId: pool.id },
      select: {
        id: true,
        chlorine: true,
        ph: true,
        alkalinity: true,
        hardness: true,
        temperature: true
      }
    });

    await Promise.all(
      measurements.map(measurement => {
        const statuses = computeMeasurementStatuses(pool, measurement);

        return tx.measurement.update({
          where: { id: measurement.id },
          data: statuses
        });
      })
    );

    return pool;
  });

  revalidatePath('/');
  revalidatePath(`/condominios/${parsed.data.condominiumId}`);
  revalidatePath(`/condominios/${parsed.data.condominiumId}/piscinas/${parsed.data.poolId}`);
  revalidatePath(`/public/piscinas/${updatedPool.slug}`);
  revalidatePath('/debug/fotos');
  redirect(`/condominios/${parsed.data.condominiumId}/piscinas/${parsed.data.poolId}`);
}

export async function saveMeasurementAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const raw = Object.fromEntries(formData.entries());
  const intent = String(formData.get('intent') ?? 'save');
  const photo = formData.get('photo') as File | null;
  const parsed = measurementSchema.safeParse({ ...raw, photoPath: raw.photoPath || undefined });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revise os dados da medição.' };
  }

  const pool = await prisma.pool.findUnique({ where: { id: parsed.data.poolId } });
  if (!pool) return { error: 'Piscina não encontrada.' };

  if (pool.tracksTemperature && typeof parsed.data.temperature !== 'number') {
    return { error: 'Informe a temperatura para piscinas com monitoramento de temperatura ativo.' };
  }

  if (!pool.tracksTemperature && parsed.data.temperature !== undefined) {
    parsed.data.temperature = undefined;
  }

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
        temperature: pool.tracksTemperature ? parsed.data.temperature : null,
        measuredAt: new Date(parsed.data.measuredAt),
        ...photoFields,
        ...statuses
      }
    });
  } else {
    await prisma.measurement.create({
      data: {
        ...parsed.data,
        temperature: pool.tracksTemperature ? parsed.data.temperature : null,
        measuredAt: new Date(parsed.data.measuredAt),
        ...photoFields,
        ...statuses
      }
    });
  }

  revalidatePath('/');
  revalidatePath(`/condominios/${pool.condominiumId}/piscinas/${pool.id}`);
  if (parsed.data.id) {
    revalidatePath(`/condominios/${pool.condominiumId}/piscinas/${pool.id}/medicoes/${parsed.data.id}`);
  }
  revalidatePath(`/debug/fotos`);
  revalidatePath(`/public/piscinas/${pool.slug}`);
  if (intent === 'save_and_new') {
    redirect(`/condominios/${pool.condominiumId}/piscinas/${pool.id}/medicoes/nova`);
  }

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
  revalidatePath(`/condominios/${condominiumId}/piscinas/${poolId}/medicoes/${measurementId}`);
  revalidatePath(`/debug/fotos`);
  if (pool) revalidatePath(`/public/piscinas/${pool.slug}`);
}
