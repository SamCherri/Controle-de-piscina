import { promises as fs } from 'node:fs';
import path from 'node:path';
import { extname } from 'node:path';
import sharp from 'sharp';

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_UPLOAD_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

export type MeasurementPhotoRecord = {
  id: string;
  photoData?: Uint8Array | Buffer | null;
  photoPath?: string | null;
};

export type MeasurementPhotoState =
  | { kind: 'embedded'; src: string; warning?: undefined }
  | { kind: 'legacy-external'; src: string; warning: string }
  | { kind: 'legacy-local'; src: string; warning: string }
  | { kind: 'missing'; src?: undefined; warning?: undefined };

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const EXTERNAL_FETCH_TIMEOUT_MS = 8000;

type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

type PreparedImageUpload =
  | { ok: true; fileName?: string; mimeType?: AllowedUploadMimeType; buffer?: Buffer }
  | { ok: false; error: string };

export type MeasurementPhotoPersistenceResult =
  | {
      ok: true;
      source: 'none';
      photoPath: string | null;
      photoData?: undefined;
      photoMimeType?: undefined;
    }
  | {
      ok: true;
      source: 'embedded';
      photoPath: null;
      photoData: Buffer;
      photoMimeType: AllowedUploadMimeType;
    }
  | {
      ok: true;
      source: 'legacy';
      photoPath: string;
      photoData?: undefined;
      photoMimeType?: undefined;
    }
  | {
      ok: false;
      error: string;
    };

export function toPrismaBytes(buffer: Buffer) {
  return new Uint8Array(buffer);
}

export function validateImageUpload(file: File | null) {
  if (!file || file.size === 0) {
    return { ok: true as const };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return { ok: false as const, error: 'A imagem deve ter no máximo 5 MB.' };
  }

  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
    return { ok: false as const, error: 'Envie uma imagem JPG, PNG ou WEBP.' };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_UPLOAD_EXTENSIONS.includes(extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
    return { ok: false as const, error: 'A extensão do arquivo deve ser JPG, PNG ou WEBP.' };
  }

  return { ok: true as const, extension, mimeType };
}

function validateImageFileName(fileName: string, mimeType: AllowedUploadMimeType) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const expectedExtension = EXTENSION_BY_MIME_TYPE[mimeType];

  if (!extension || !ALLOWED_UPLOAD_EXTENSIONS.includes(extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
    return { ok: false as const, error: 'A extensão do arquivo deve ser JPG, PNG ou WEBP.' };
  }

  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
  if (normalizedExtension !== expectedExtension) {
    return { ok: false as const, error: 'O conteúdo da imagem não corresponde ao tipo do arquivo enviado.' };
  }

  return { ok: true as const, extension: normalizedExtension };
}

async function inspectImageBuffer(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer, { failOn: 'error' }).metadata();
    if (!metadata.format || !metadata.width || !metadata.height) {
      return { ok: false as const, error: 'Arquivo de imagem inválido ou corrompido.' };
    }

    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
      return { ok: false as const, error: 'Formato de imagem não suportado.' };
    }

    return { ok: true as const, metadata };
  } catch {
    return { ok: false as const, error: 'Arquivo de imagem inválido ou corrompido.' };
  }
}

export function normalizeLegacyPhotoPath(photoPath?: string | null) {
  if (!photoPath) return undefined;

  const trimmedPath = photoPath.trim();
  if (!trimmedPath) return undefined;
  if (/^https?:\/\//i.test(trimmedPath) || trimmedPath.startsWith('data:')) return trimmedPath;

  const normalizedSlashes = trimmedPath.replace(/\\/g, '/');
  const withoutPublicPrefix = normalizedSlashes.replace(/^.*\/public(?=\/)/i, '');
  const uploadsMatch = withoutPublicPrefix.match(/(?:^|\/)(uploads\/.+)$/i);
  const candidatePath = uploadsMatch ? `/${uploadsMatch[1]}` : withoutPublicPrefix;

  return candidatePath.startsWith('/') ? candidatePath : `/${candidatePath}`;
}

function normalizeMimeType(mimeType?: string | null) {
  const normalizedMimeType = mimeType?.split(';')[0]?.trim().toLowerCase();
  if (!normalizedMimeType) {
    return undefined;
  }

  return ALLOWED_UPLOAD_MIME_TYPES.includes(normalizedMimeType as AllowedUploadMimeType)
    ? (normalizedMimeType as AllowedUploadMimeType)
    : undefined;
}

export function resolveLegacyPhotoFilePath(photoPath?: string | null) {
  const normalizedPath = normalizeLegacyPhotoPath(photoPath);
  if (!normalizedPath || /^https?:\/\//i.test(normalizedPath) || normalizedPath.startsWith('data:')) {
    return undefined;
  }

  const relativePath = normalizedPath.replace(/^\/+/, '');
  const absolutePath = path.join(process.cwd(), 'public', relativePath);
  const publicRoot = path.join(process.cwd(), 'public') + path.sep;

  if (!absolutePath.startsWith(publicRoot)) {
    return undefined;
  }

  return absolutePath;
}

async function prepareImageBuffer({
  buffer,
  mimeType,
  fileName
}: {
  buffer: Buffer;
  mimeType?: string | null;
  fileName: string;
}): Promise<PreparedImageUpload> {
  if (buffer.length === 0) {
    return { ok: false, error: 'Nenhum arquivo enviado.' };
  }

  if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
    return { ok: false, error: 'A imagem deve ter no máximo 5 MB.' };
  }

  const normalizedMimeType = normalizeMimeType(mimeType);
  if (!normalizedMimeType) {
    return { ok: false, error: 'Envie uma imagem JPG, PNG ou WEBP.' };
  }

  const nameValidation = validateImageFileName(fileName, normalizedMimeType);
  if (!nameValidation.ok) {
    return nameValidation;
  }

  const inspectedImage = await inspectImageBuffer(buffer);
  if (!inspectedImage.ok) {
    return inspectedImage;
  }

  const detectedFormat = inspectedImage.metadata.format === 'jpeg' ? 'jpg' : inspectedImage.metadata.format;
  const expectedFormat = EXTENSION_BY_MIME_TYPE[normalizedMimeType];
  if (detectedFormat !== expectedFormat) {
    return { ok: false, error: 'O conteúdo da imagem não corresponde ao tipo do arquivo enviado.' };
  }

  return {
    ok: true,
    fileName,
    mimeType: normalizedMimeType,
    buffer
  };
}

export async function prepareImageUpload(file: File | null): Promise<PreparedImageUpload> {
  const validation = validateImageUpload(file);
  if (!validation.ok) {
    return validation;
  }

  if (!file || file.size === 0) {
    return { ok: true, fileName: undefined, mimeType: undefined, buffer: undefined };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { mimeType } = validation;
  if (!mimeType) {
    return { ok: false as const, error: 'Falha ao validar o arquivo enviado.' };
  }

  return prepareImageBuffer({ buffer, mimeType, fileName: file.name });
}

function inferSupportedMimeTypeFromPath(photoPath: string) {
  return MIME_TYPE_BY_EXTENSION[extname(photoPath).toLowerCase()];
}

async function persistDataUrlPhoto(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
  if (!match) {
    return { ok: false as const, error: 'Data URL de foto inválida ou em formato não suportado.' };
  }

  const [, mimeType, base64Payload] = match;
  const buffer = Buffer.from(base64Payload, 'base64');
  const fileExtension = EXTENSION_BY_MIME_TYPE[mimeType.toLowerCase()];
  const upload = await prepareImageBuffer({ buffer, mimeType, fileName: `measurement.${fileExtension}` });

  if (!upload.ok || !upload.buffer || !upload.mimeType) {
    return upload.ok
      ? { ok: false as const, error: 'Falha ao processar a foto em data URL.' }
      : upload;
  }

  return {
    ok: true as const,
    photoData: upload.buffer,
    photoMimeType: upload.mimeType,
    photoPath: null
  };
}

async function persistExternalPhoto(photoUrl: string) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), EXTERNAL_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(photoUrl, {
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

    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    const normalizedMimeType = normalizeMimeType(mimeType);
    const fileName = (() => {
      try {
        const pathname = new URL(photoUrl).pathname;
        const baseName = pathname.split('/').pop()?.trim();
        if (baseName) {
          return baseName;
        }
      } catch {
        // fallback below
      }

      const extension = normalizedMimeType ? EXTENSION_BY_MIME_TYPE[normalizedMimeType] : 'jpg';
      return `measurement-upload.${extension}`;
    })();

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
      return { ok: false as const, error: 'A foto externa excede o limite de 5 MB.' };
    }

    const upload = await prepareImageBuffer({ buffer, mimeType, fileName });

    if (!upload.ok || !upload.buffer || !upload.mimeType) {
      return upload.ok
        ? { ok: false as const, error: 'Falha ao validar a foto externa baixada.' }
        : upload;
    }

    return {
      ok: true as const,
      photoData: upload.buffer,
      photoMimeType: upload.mimeType,
      photoPath: null
    };
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
    const mimeType = inferSupportedMimeTypeFromPath(absolutePath);
    if (!mimeType) {
      return { ok: false as const, error: 'A extensão da foto legada não é suportada.' };
    }

    const upload = await prepareImageBuffer({
      buffer,
      mimeType,
      fileName: path.basename(absolutePath)
    });

    if (!upload.ok || !upload.buffer || !upload.mimeType) {
      return upload.ok
        ? { ok: false as const, error: 'Falha ao validar a foto legada encontrada.' }
        : upload;
    }

    return {
      ok: true as const,
      photoData: upload.buffer,
      photoMimeType: upload.mimeType,
      photoPath: null
    };
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
      source: 'embedded',
      photoData: upload.buffer,
      photoMimeType: upload.mimeType,
      photoPath: null
    };
  }

  const normalizedPhotoPath = normalizeLegacyPhotoPath(photoPath);
  if (!normalizedPhotoPath) {
    return { ok: true, source: 'none', photoPath: photoPath ?? null };
  }

  const resolvedPhoto =
    normalizedPhotoPath.startsWith('data:')
      ? await persistDataUrlPhoto(normalizedPhotoPath)
      : /^https?:\/\//i.test(normalizedPhotoPath)
        ? await persistExternalPhoto(normalizedPhotoPath)
        : await persistLegacyLocalPhoto(normalizedPhotoPath);

  if (resolvedPhoto.ok) {
    return { ...resolvedPhoto, source: 'embedded' };
  }

  if (onRecoveryFailure === 'preserve-legacy-path') {
    return {
      ok: true,
      source: 'legacy',
      photoPath: normalizedPhotoPath
    };
  }

  return resolvedPhoto;
}

export function getMeasurementPhotoState(measurement: MeasurementPhotoRecord): MeasurementPhotoState {
  if (measurement.photoData && measurement.photoData.length > 0) {
    return {
      kind: 'embedded',
      src: `/api/measurements/${measurement.id}/photo`
    };
  }

  const normalizedLegacyPath = normalizeLegacyPhotoPath(measurement.photoPath);
  if (!normalizedLegacyPath) {
    return { kind: 'missing' };
  }

  if (/^https?:\/\//i.test(normalizedLegacyPath) || normalizedLegacyPath.startsWith('data:')) {
    return {
      kind: 'legacy-external',
      src: `/api/measurements/${measurement.id}/photo`,
      warning: 'Esta foto ainda depende de uma origem externa legada. Se o link antigo sair do ar, será necessário reenviar a imagem para mantê-la disponível.'
    };
  }

  return {
    kind: 'legacy-local',
    src: `/api/measurements/${measurement.id}/photo`,
    warning: 'Esta foto veio do armazenamento local legado. Em deploys/restarts do Railway, arquivos locais antigos podem sumir; reenvie a imagem para gravá-la definitivamente no banco.'
  };
}

export function getMeasurementPhotoSrc(measurement: MeasurementPhotoRecord) {
  const state = getMeasurementPhotoState(measurement);
  return state.kind === 'missing' ? undefined : state.src;
}
