export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureDefaultAdminUser } = await import('@/lib/default-admin');
    await ensureDefaultAdminUser();
  }
}
