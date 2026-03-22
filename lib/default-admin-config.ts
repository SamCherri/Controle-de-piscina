export const defaultAdminCredentials = {
  email: process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase() || 'admin@piscina.com',
  password: process.env.DEFAULT_ADMIN_PASSWORD?.trim() || 'admin123',
  name: process.env.DEFAULT_ADMIN_NAME?.trim() || 'Administrador'
};
