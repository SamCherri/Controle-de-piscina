import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

export class UploadValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'UploadValidationError';
    this.status = status;
  }
}

function getExtension(fileName: string) {
  return path.extname(fileName || '').toLowerCase();
}

export async function validateImageFile(file: File | null) {
  if (!file) {
    throw new UploadValidationError('Nenhum arquivo enviado.', 400);
  }

  if (file.size <= 0) {
    throw new UploadValidationError('O arquivo enviado está vazio.', 400);
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new UploadValidationError('A imagem excede o limite de 5 MB.', 413);
  }

  const extension = getExtension(file.name);
  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    throw new UploadValidationError('Formato inválido. Envie JPG, JPEG, PNG ou WEBP.', 415);
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    throw new UploadValidationError('Tipo MIME inválido. Envie JPG, JPEG, PNG ou WEBP.', 415);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length <= 0) {
    throw new UploadValidationError('O arquivo enviado está vazio.', 400);
  }

  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new UploadValidationError('O arquivo não é uma imagem válida.', 415);
  }

  if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
    throw new UploadValidationError('Formato de imagem não suportado.', 415);
  }

  if (!metadata.width || !metadata.height) {
    throw new UploadValidationError('A imagem enviada está corrompida.', 415);
  }

  return {
    buffer,
    extension,
    mimeType: file.type,
    size: file.size,
    width: metadata.width,
    height: metadata.height
  };
}

export async function persistValidatedImageUpload(file: File | null) {
  const validated = await validateImageFile(file);
  const fileName = `${randomUUID()}${validated.extension}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), validated.buffer);

  return {
    path: `/uploads/${fileName}`,
    ...validated
  };
}

export { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES };
