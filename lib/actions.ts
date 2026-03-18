'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';
import { createSession, verifyPassword } from '@/lib/auth';
import { condominiumSchema, loginSchema, measurementSchema, poolSchema } from '@/lib/validators';
import { slugify } from '@/lib/utils';
import { computeMeasurementStatuses } from '@/lib/status';

export type ActionState = { success?: string; error?: string };

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { error: 'Usuário não encontrado.' };

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return { error: 'Senha inválida.' };

  await createSession(user.id, user.email, user.name);
  redirect('/');
}

export async function createCondominiumAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = condominiumSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Revise os dados do condomínio.' };

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
  if (!parsed.success) return { error: 'Revise os dados da piscina.' };

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
  if (!file || file.size === 0) return undefined;
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);
  return `/uploads/${fileName}`;
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

  const photoPath = (await persistUpload(photo)) || parsed.data.photoPath;
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
