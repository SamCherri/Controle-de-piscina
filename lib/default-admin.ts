import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { defaultAdminCredentials } from '@/lib/default-admin-config';

declare global {
  var defaultAdminBootstrapPromise: Promise<void> | undefined;
}

async function createDefaultAdminUser() {
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: defaultAdminCredentials.email },
    select: { id: true }
  });

  if (existingAdmin) {
    return;
  }

  const passwordHash = await hashPassword(defaultAdminCredentials.password);

  await prisma.adminUser.upsert({
    where: { email: defaultAdminCredentials.email },
    update: {},
    create: {
      email: defaultAdminCredentials.email,
      name: defaultAdminCredentials.name,
      passwordHash
    }
  });
}

export async function ensureDefaultAdminUser() {
  if (!global.defaultAdminBootstrapPromise) {
    global.defaultAdminBootstrapPromise = createDefaultAdminUser().catch(error => {
      global.defaultAdminBootstrapPromise = undefined;
      throw error;
    });
  }

  await global.defaultAdminBootstrapPromise;
}
