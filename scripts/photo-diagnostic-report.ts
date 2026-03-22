import { loadEnvConfig } from '@next/env';
import { prisma } from '@/lib/db';

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não configurada. Defina a variável de ambiente ou crie um .env antes de executar `npm run photos:audit`.');
    process.exitCode = 1;
    return;
  }

  const measurements = await prisma.measurement.findMany({
    orderBy: { measuredAt: 'desc' },
    select: {
      id: true,
      poolId: true,
      measuredAt: true,
      photoData: true,
      photoPath: true,
      pool: {
        select: {
          name: true,
          slug: true,
          condominium: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  const total = measurements.length;
  const embedded = measurements.filter(item => item.photoData && item.photoData.length > 0);
  const legacy = measurements.filter(item => !item.photoData && item.photoPath);
  const missing = measurements.filter(item => !item.photoData && !item.photoPath);

  const latestByPool = new Map<string, (typeof measurements)[number]>();
  const latestPhotoByPool = new Map<string, (typeof measurements)[number]>();

  for (const measurement of measurements) {
    if (!latestByPool.has(measurement.poolId)) {
      latestByPool.set(measurement.poolId, measurement);
    }

    if (!latestPhotoByPool.has(measurement.poolId) && ((measurement.photoData && measurement.photoData.length > 0) || measurement.photoPath)) {
      latestPhotoByPool.set(measurement.poolId, measurement);
    }
  }

  const poolsWithLatestMissingPhoto = [...latestByPool.values()].filter(item => !item.photoData && !item.photoPath);
  const poolsUsingFallbackPhoto = poolsWithLatestMissingPhoto
    .map(item => ({ latest: item, fallback: latestPhotoByPool.get(item.poolId) }))
    .filter((item): item is { latest: (typeof measurements)[number]; fallback: (typeof measurements)[number] } => Boolean(item.fallback));

  console.log('Diagnóstico de fotos das medições');
  console.log(`- total de medições: ${total}`);
  console.log(`- com foto no banco: ${embedded.length}`);
  console.log(`- com caminho legado (photoPath): ${legacy.length}`);
  console.log(`- sem foto: ${missing.length}`);
  console.log(`- piscinas cuja última medição está sem foto: ${poolsWithLatestMissingPhoto.length}`);
  console.log(`- piscinas que exigirão fallback visual para mostrar a última foto disponível: ${poolsUsingFallbackPhoto.length}`);

  if (legacy.length > 0) {
    console.log('\nMedições ainda dependentes de photoPath legado:');
    for (const measurement of legacy.slice(0, 20)) {
      console.log(`- ${measurement.id} | ${measurement.pool.condominium.name} / ${measurement.pool.name} | ${measurement.measuredAt.toISOString()} | ${measurement.photoPath}`);
    }
    if (legacy.length > 20) {
      console.log(`- ... e mais ${legacy.length - 20}`);
    }
  }

  if (poolsUsingFallbackPhoto.length > 0) {
    console.log('\nPiscinas em que a última medição está sem foto, mas existe uma foto anterior:');
    for (const item of poolsUsingFallbackPhoto.slice(0, 20)) {
      console.log(`- ${item.latest.pool.condominium.name} / ${item.latest.pool.name} | última medição: ${item.latest.measuredAt.toISOString()} | última foto disponível: ${item.fallback.measuredAt.toISOString()} | /public/piscinas/${item.latest.pool.slug}`);
    }
    if (poolsUsingFallbackPhoto.length > 20) {
      console.log(`- ... e mais ${poolsUsingFallbackPhoto.length - 20}`);
    }
  }
}

main()
  .catch(error => {
    console.error('Falha ao gerar diagnóstico de fotos.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
