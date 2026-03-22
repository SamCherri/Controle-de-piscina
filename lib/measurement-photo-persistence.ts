import { promises as fs } from 'node:fs';
import { lookup } from 'node:dns/promises';
import { extname } from 'node:path';
import { isIP } from 'node:net';
import {
  type AllowedUploadMimeType,
  getFileExtensionForMimeType,
  MAX_UPLOAD_SIZE_BYTES,
  normalizeLegacyPhotoPath,
  normalizeMimeType,
  prepareImageBuffer,
  resolveLegacyPhotoFilePath
} from '@/lib/uploads';

const EXTERNAL_FETCH_TIMEOUT_MS = 8000;

const MIME_TYPE_BY_EXTENSION: Partial<Record<string, AllowedUploadMimeType>> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

type EmbeddedPhotoResult = {
  ok: true;
  kind: 'embedded';
  photoPath: null;
  photoData: Buffer;
  photoMimeType: AllowedUploadMimeType;
};

type PreservedLegacyPhotoResult = {
  ok: true;
  kind: 'preserved-legacy';
  photoPath: string;
  reason: 'unreachable';
};

type NoPhotoResult = {
  ok: true;
  kind: 'none';
  photoPath: null;
};

type FailedPhotoResult = {
  ok: false;
  error: string;
};

export type MeasurementPhotoPersistenceResult =
  | EmbeddedPhotoResult
  | PreservedLegacyPhotoResult
  | NoPhotoResult
  | FailedPhotoResult;

export type MeasurementPhotoDeliveryResult =
  | {
      kind: 'embedded';
      photoData: Buffer;
      photoMimeType: AllowedUploadMimeType;
      shouldPersistToDatabase: boolean;
    }
  | {
      kind: 'missing';
      error: string;
    };

function isIpv4Private(address: string) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return true;
  }

  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isIpv6Private(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  const mappedIpv4Match = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4Match) {
    return isIpv4Private(mappedIpv4Match[1]);
  }

  return false;
}

function isPrivateOrReservedIp(address: string) {
  const version = isIP(address);
  if (version === 4) return isIpv4Private(address);
  if (version === 6) return isIpv6Private(address);
  return true;
}

async function ensureSafeExternalPhotoUrl(photoUrl: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(photoUrl);
  } catch {
    return { ok: false as const, error: 'URL externa da foto é inválida.' };
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { ok: false as const, error: 'A foto externa deve usar HTTP ou HTTPS.' };
  }

  const hostname = parsedUrl.hostname.trim().toLowerCase();
  if (!hostname) {
    return { ok: false as const, error: 'URL externa da foto é inválida.' };
  }

  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return { ok: false as const, error: 'Host da foto externa não é permitido.' };
  }

  if (isIP(hostname) && isPrivateOrReservedIp(hostname)) {
    return { ok: false as const, error: 'Host da foto externa não é permitido.' };
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(address => isPrivateOrReservedIp(address.address))) {
      return { ok: false as const, error: 'Host da foto externa não é permitido.' };
    }
  } catch {
    return { ok: false as const, error: 'Não foi possível validar o host da foto externa.' };
  }

  return { ok: true as const, url: parsedUrl.toString() };
}

async function persistPhotoFromBuffer({
  buffer,
  mimeType,
  fileName,
  invalidMessage
}: {
  buffer: Buffer;
  mimeType?: string | null;
  fileName: string;
  invalidMessage: string;
}): Promise<EmbeddedPhotoResult | FailedPhotoResult> {
  const upload = await prepareImageBuffer({ buffer, mimeType, fileName });
  if (!upload.ok || !upload.buffer || !upload.mimeType) {
    return upload.ok ? { ok: false, error: invalidMessage } : upload;
  }

  return {
    ok: true,
    kind: 'embedded',
    photoPath: null,
    photoData: upload.buffer,
    photoMimeType: upload.mimeType
  };
}

async function persistDataUrlPhoto(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
  if (!match) {
    return { ok: false as const, error: 'Data URL de foto inválida ou em formato não suportado.' };
  }

  const mimeType = normalizeMimeType(match[1]);
  if (!mimeType) {
    return { ok: false as const, error: 'Data URL de foto inválida ou em formato não suportado.' };
  }

  const buffer = Buffer.from(match[2], 'base64');
  return persistPhotoFromBuffer({
    buffer,
    mimeType,
    fileName: `measurement.${getFileExtensionForMimeType(mimeType)}`,
    invalidMessage: 'Falha ao processar a foto em data URL.'
  });
}

async function persistExternalPhoto(photoUrl: string) {
  const safeUrl = await ensureSafeExternalPhotoUrl(photoUrl);
  if (!safeUrl.ok) {
    return safeUrl;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), EXTERNAL_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(safeUrl.url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: abortController.signal
    });

    if (!response.ok) {
      return { ok: false as const, error: 'Falha ao baixar a foto externa informada.' };
    }

    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_SIZE_BYTES) {
      return { ok: false as const, error: 'A foto externa excede o limite de 5 MB.' };
    }

    const mimeType = response.headers.get('content-type');
    const pathname = new URL(safeUrl.url).pathname;
    const fileName = pathname.split('/').pop()?.trim()
      || `measurement.${getFileExtensionForMimeType(normalizeMimeType(mimeType) ?? 'image/jpeg')}`;
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
      return { ok: false as const, error: 'A foto externa excede o limite de 5 MB.' };
    }

    return persistPhotoFromBuffer({
      buffer,
      mimeType,
      fileName,
      invalidMessage: 'Falha ao validar a foto externa baixada.'
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false as const, error: 'Tempo esgotado ao acessar a foto externa informada.' };
    }

    return { ok: false as const, error: 'Falha ao acessar a foto externa informada.' };
  } finally {
    clearTimeout(timeout);
  }
}

async function persistLegacyLocalPhoto(photoPath: string) {
  const absolutePath = resolveLegacyPhotoFilePath(photoPath);
  if (!absolutePath) {
    return { ok: false as const, error: 'Caminho da foto legado é inválido.' };
  }

  try {
    const buffer = await fs.readFile(absolutePath);
    const mimeType = MIME_TYPE_BY_EXTENSION[extname(absolutePath).toLowerCase()];
    if (!mimeType) {
      return { ok: false as const, error: 'A extensão da foto legada não é suportada.' };
    }

    return persistPhotoFromBuffer({
      buffer,
      mimeType,
      fileName: absolutePath.split('/').pop() || `measurement.${getFileExtensionForMimeType(mimeType)}`,
      invalidMessage: 'Falha ao validar a foto legada encontrada.'
    });
  } catch {
    return { ok: false as const, error: 'A foto legada não foi encontrada neste ambiente.' };
  }
}

export async function resolveMeasurementPhotoPersistence({
  photoPath,
  upload,
  onRecoveryFailure = 'error'
}: {
  photoPath?: string | null;
  upload?:
    | {
        buffer?: Buffer;
        mimeType?: AllowedUploadMimeType;
      }
    | undefined;
  onRecoveryFailure?: 'error' | 'preserve-legacy-path';
}): Promise<MeasurementPhotoPersistenceResult> {
  if (upload?.buffer && upload.mimeType) {
    return {
      ok: true,
      kind: 'embedded',
      photoPath: null,
      photoData: upload.buffer,
      photoMimeType: upload.mimeType
    };
  }

  const normalizedPhotoPath = normalizeLegacyPhotoPath(photoPath);
  if (!normalizedPhotoPath) {
    return { ok: true, kind: 'none', photoPath: null };
  }

  if (normalizedPhotoPath.startsWith('data:')) {
    return persistDataUrlPhoto(normalizedPhotoPath);
  }

  if (/^https?:\/\//i.test(normalizedPhotoPath)) {
    const recoveredExternalPhoto = await persistExternalPhoto(normalizedPhotoPath);
    return recoveredExternalPhoto;
  }

  const recoveredLocalPhoto = await persistLegacyLocalPhoto(normalizedPhotoPath);
  if (recoveredLocalPhoto.ok) {
    return recoveredLocalPhoto;
  }

  if (onRecoveryFailure === 'preserve-legacy-path') {
    return {
      ok: true,
      kind: 'preserved-legacy',
      photoPath: normalizedPhotoPath,
      reason: 'unreachable'
    };
  }

  return recoveredLocalPhoto;
}

export async function resolveMeasurementPhotoDelivery(photoPath?: string | null): Promise<MeasurementPhotoDeliveryResult> {
  const normalizedPhotoPath = normalizeLegacyPhotoPath(photoPath);
  if (!normalizedPhotoPath) {
    return { kind: 'missing', error: 'Nenhuma foto disponível para esta medição.' };
  }

  if (normalizedPhotoPath.startsWith('data:')) {
    const dataUrlPhoto = await persistDataUrlPhoto(normalizedPhotoPath);
    return dataUrlPhoto.ok
      ? {
          kind: 'embedded',
          photoData: dataUrlPhoto.photoData,
          photoMimeType: dataUrlPhoto.photoMimeType,
          shouldPersistToDatabase: true
        }
      : { kind: 'missing', error: dataUrlPhoto.error };
  }

  if (/^https?:\/\//i.test(normalizedPhotoPath)) {
    const recoveredExternalPhoto = await persistExternalPhoto(normalizedPhotoPath);
    return recoveredExternalPhoto.ok
      ? {
          kind: 'embedded',
          photoData: recoveredExternalPhoto.photoData,
          photoMimeType: recoveredExternalPhoto.photoMimeType,
          shouldPersistToDatabase: true
        }
      : { kind: 'missing', error: recoveredExternalPhoto.error };
  }

  const recoveredLocalPhoto = await persistLegacyLocalPhoto(normalizedPhotoPath);
  return recoveredLocalPhoto.ok
    ? {
        kind: 'embedded',
        photoData: recoveredLocalPhoto.photoData,
        photoMimeType: recoveredLocalPhoto.photoMimeType,
        shouldPersistToDatabase: true
      }
    : { kind: 'missing', error: recoveredLocalPhoto.error };
}
