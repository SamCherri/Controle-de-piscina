export const AUTH_COOKIE_NAME = 'pool_admin_session';
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;
export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_EXPIRY_MINUTES = 30;
export const PASSWORD_MIN_LENGTH = 8;

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function getPasswordResetBaseUrl() {
  return process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}
