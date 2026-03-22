import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import { prisma } from '@/lib/db';
import { normalizeLegacyPhotoPath, resolveLegacyPhotoFilePath } from '@/lib/uploads';

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

async function main() {
  const measurements = await prisma.measurement.findMany({
    where: {
      photoData: null,
      photoPath: {
        not: null
      }
    },
    select: {
      id: true,
      photoPath: true
    }
  });

  if (measurements.length === 0) {
    console.log('Nenhuma foto legada pendente encontrada.');
    return;
  }

  let migrated = 0;
  let external = 0;
  let missing = 0;
  let invalid = 0;

  for (const measurement of measurements) {
    const normalizedPath = normalizeLegacyPhotoPath(measurement.photoPath);
    if (!normalizedPath) {
      invalid += 1;
      console.log(`[ignorado] ${measurement.id}: caminho vazio ou inválido.`);
      continue;
    }

    if (/^https?:\/\//i.test(normalizedPath) || normalizedPath.startsWith('data:')) {
      external += 1;
      console.log(`[externo] ${measurement.id}: origem externa preservada em ${normalizedPath}.`);
      continue;
    }

    const absolutePath = resolveLegacyPhotoFilePath(measurement.photoPath);
    if (!absolutePath) {
      invalid += 1;
      console.log(`[ignorado] ${measurement.id}: caminho fora de public/.`);
      continue;
    }

    try {
      const buffer = await fs.readFile(absolutePath);
      const mimeType = MIME_TYPE_BY_EXTENSION[extname(absolutePath).toLowerCase()];

      if (!mimeType) {
        invalid += 1;
        console.log(`[ignorado] ${measurement.id}: extensão não suportada em ${absolutePath}.`);
        continue;
      }

      await prisma.measurement.update({
        where: { id: measurement.id },
        data: {
          photoData: buffer,
          photoMimeType: mimeType,
          photoPath: null
        }
      });

      migrated += 1;
      console.log(`[migrado] ${measurement.id}: ${absolutePath} -> banco (${mimeType}).`);
    } catch {
      missing += 1;
      console.log(`[ausente] ${measurement.id}: arquivo não encontrado em ${absolutePath}. Reenvie a foto manualmente.`);
    }
  }

  console.log('Resumo da migração de fotos legadas:');
  console.log(`- migradas para o banco: ${migrated}`);
  console.log(`- externas preservadas: ${external}`);
  console.log(`- ausentes no disco: ${missing}`);
  console.log(`- inválidas/ignoradas: ${invalid}`);
}

main()
  .catch(error => {
    console.error('Falha ao migrar fotos legadas.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
