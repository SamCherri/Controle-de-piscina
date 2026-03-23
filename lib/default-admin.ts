import 'server-only';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { defaultAdminCredentials } from '@/lib/default-admin-config';
import { isProduction } from '@/lib/auth/config';

const USING_FALLBACK_DEFAULT_PASSWORD = defaultAdminCredentials.password === 'admin123';

function shouldBootstrapDefaultAdmin() {
  if (!isProduction()) {
    return true;
  }

  if (USING_FALLBACK_DEFAULT_PASSWORD) {
    console.warn('[auth] Bootstrap do admin padrão ignorado em produção porque DEFAULT_ADMIN_PASSWORD não foi configurada.');
    return false;
  }

  return true;
}

declare global {
  var defaultAdminBootstrapPromise: Promise<void> | undefined;
}

async function createDefaultAdminUser() {
  if (!shouldBootstrapDefaultAdmin()) {
    return;
  }

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
      passwordHash,
      mustChangePassword: true
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
