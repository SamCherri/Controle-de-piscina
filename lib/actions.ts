'use server';

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authenticateUser, createSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeMeasurementStatuses } from '@/lib/status';
import { slugify } from '@/lib/utils';
import {
  condominiumSchema,
  loginSchema,
  measurementSchema,
  poolSchema,
  validateImageUpload
} from '@/lib/validators';

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

async function persistUpload(file: File | null) {
  const validation = validateImageUpload(file);
  if (!validation.ok) {
    return validation;
  }

  if (!file || file.size === 0) {
    return { ok: true as const, path: undefined };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${randomUUID()}.${validation.extension}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);
  return { ok: true as const, path: `/uploads/${fileName}` };
}

export async function saveMeasurementAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const photo = formData.get('photo') as File | null;
  const parsed = measurementSchema.safeParse({ ...raw, photoPath: raw.photoPath || undefined });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revise os dados da medição.' };
  }

  const pool = await prisma.pool.findUnique({ where: { id: parsed.data.poolId } });
  if (!pool) return { error: 'Piscina não encontrada.' };

  const upload = await persistUpload(photo);
  if (!upload.ok) {
    return { error: upload.error };
  }

  const photoPath = upload.path || parsed.data.photoPath;
  const statuses = computeMeasurementStatuses(pool, parsed.data);

  if (parsed.data.id) {
    await prisma.measurement.update({
      where: { id: parsed.data.id },
      data: {
        ...parsed.data,
        measuredAt: new Date(parsed.data.measuredAt),
        photoPath,
        ...statuses
      }
    });
  } else {
    await prisma.measurement.create({
      data: {
        ...parsed.data,
        measuredAt: new Date(parsed.data.measuredAt),
        photoPath,
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
  const measurementId = String(formData.get('measurementId'));
  const poolId = String(formData.get('poolId'));
  const condominiumId = String(formData.get('condominiumId'));
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  await prisma.measurement.delete({ where: { id: measurementId } });
  revalidatePath(`/condominios/${condominiumId}/piscinas/${poolId}`);
  if (pool) revalidatePath(`/public/piscinas/${pool.slug}`);
}
