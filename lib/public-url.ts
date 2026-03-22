import { headers } from 'next/headers';

function normalizeBaseUrl(rawUrl?: string | null) {
  if (!rawUrl) return undefined;

  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return undefined;

  try {
    return new URL(trimmedUrl).origin;
  } catch {
    return undefined;
  }
}

function isPrivateOrReservedHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized.endsWith('.local')) {
    return true;
  }

  if (/^127\./.test(normalized) || /^10\./.test(normalized) || /^192\.168\./.test(normalized)) {
    return true;
  }

  const match172 = normalized.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  if (/^169\.254\./.test(normalized) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(normalized)) {
    return true;
  }

  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  return false;
}

function getHeaderBasedBaseUrl() {
  const requestHeaders = headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = forwardedHost ?? requestHeaders.get('host');

  if (!host) {
    return undefined;
  }

  const forwardedProto = requestHeaders.get('x-forwarded-proto');
  const protocol = forwardedProto === 'http' || forwardedProto === 'https'
    ? forwardedProto
    : host.includes('localhost') || host.startsWith('127.0.0.1')
      ? 'http'
      : 'https';

  return `${protocol}://${host}`;
}

export type PublicAppUrlResolution = {
  baseUrl: string;
  source: 'configured' | 'request' | 'fallback';
  isShareable: boolean;
  warning?: string;
};

function buildResolution(baseUrl: string, source: PublicAppUrlResolution['source']): PublicAppUrlResolution {
  const hostname = new URL(baseUrl).hostname;
  const isShareable = !isPrivateOrReservedHostname(hostname);

  return {
    baseUrl,
    source,
    isShareable,
    warning: isShareable
      ? undefined
      : 'A URL pública atual usa um host local/privado. Empresas normalmente fixam um domínio público canônico para QR codes e compartilhamento; configure NEXT_PUBLIC_APP_URL ou APP_URL com a URL pública do deploy para que qualquer celular consiga abrir a página e a foto corretamente.'
  };
}

export function resolvePublicAppUrl(): PublicAppUrlResolution {
  const configuredBaseUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.APP_URL) ??
    normalizeBaseUrl(process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : undefined) ??
    normalizeBaseUrl(process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined) ??
    normalizeBaseUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (configuredBaseUrl) {
    return buildResolution(configuredBaseUrl, 'configured');
  }

  const headerBaseUrl = getHeaderBasedBaseUrl();
  if (headerBaseUrl) {
    return buildResolution(headerBaseUrl, 'request');
  }

  return buildResolution('http://localhost:3000', 'fallback');
}

export function getPublicAppUrl() {
  return resolvePublicAppUrl().baseUrl;
}
