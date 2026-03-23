export function getLoginFailureStatus(error: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED') {
  return error === 'ACCOUNT_LOCKED' ? 429 : 401;
}
