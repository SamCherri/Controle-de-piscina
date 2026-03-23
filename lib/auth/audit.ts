import 'server-only';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import type { AuthRequestMetadata } from '@/lib/auth/utils';

export async function createAuthAuditLog(input: {
  userId?: string | null;
  email: string;
  action: string;
  success: boolean;
  metadata?: Prisma.InputJsonValue;
  request?: AuthRequestMetadata;
}) {
  await prisma.authAuditLog.create({
    data: {
      userId: input.userId ?? null,
      email: input.email,
      action: input.action,
      success: input.success,
      ip: input.request?.ip ?? null,
      userAgent: input.request?.userAgent ?? null,
      metadata: input.metadata
    }
  });
}
