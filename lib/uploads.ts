import path from 'node:path';
import sharp from 'sharp';

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_UPLOAD_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

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

export async function prepareImageUpload(file: File | null) {
  const validation = validateImageUpload(file);
  if (!validation.ok) {
    return validation;
  }

  if (!file || file.size === 0) {
    return { ok: true as const, fileName: undefined, mimeType: undefined, buffer: undefined };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const inspectedImage = await inspectImageBuffer(buffer);
  if (!inspectedImage.ok) {
    return inspectedImage;
  }

  const { extension, mimeType } = validation;
  if (!extension || !mimeType) {
    return { ok: false as const, error: 'Falha ao validar o arquivo enviado.' };
  }

  const detectedFormat = inspectedImage.metadata.format === 'jpeg' ? 'jpg' : inspectedImage.metadata.format;
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
  const normalizedMimeType = mimeType === 'image/jpeg' ? 'jpg' : mimeType.replace('image/', '');

  if (detectedFormat !== normalizedExtension || detectedFormat !== normalizedMimeType) {
    return { ok: false as const, error: 'O conteúdo da imagem não corresponde ao tipo do arquivo enviado.' };
  }

  return {
    ok: true as const,
    fileName: file.name,
    mimeType,
    buffer
  };
}

export function getMeasurementPhotoSrc(measurement: { id: string; photoData?: Uint8Array | Buffer | null; photoPath?: string | null }) {
  if ((measurement.photoData && measurement.photoData.length > 0) || normalizeLegacyPhotoPath(measurement.photoPath)) {
    return `/api/measurements/${measurement.id}/photo`;
  }

  return undefined;
}
