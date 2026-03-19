import { ensureDefaultAdminUser } from '@/lib/default-admin';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await ensureDefaultAdminUser();
  }
}
