import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';

const DEFAULT_ADMIN_EMAIL = 'admin@piscina.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_ADMIN_NAME = 'Administrador';

declare global {
  var defaultAdminBootstrapPromise: Promise<void> | undefined;
}

async function createDefaultAdminUser() {
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
    select: { id: true }
  });

  if (existingAdmin) {
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

  await prisma.adminUser.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {},
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      name: DEFAULT_ADMIN_NAME,
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

export const defaultAdminCredentials = {
  email: DEFAULT_ADMIN_EMAIL,
  password: DEFAULT_ADMIN_PASSWORD,
  name: DEFAULT_ADMIN_NAME
};
