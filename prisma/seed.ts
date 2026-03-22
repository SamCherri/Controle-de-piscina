import { PrismaClient } from '@prisma/client';
import { defaultAdminCredentials as defaultAdmin } from '../lib/default-admin-config';
import { hashPassword } from '../lib/password';
import { computeMeasurementStatuses } from '../lib/status';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword(defaultAdmin.password);

  await prisma.adminUser.upsert({
    where: { email: defaultAdmin.email },
    update: { name: defaultAdmin.name, passwordHash },
    create: {
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      passwordHash
    }
  });

  const condominium = await prisma.condominium.upsert({
    where: { slug: 'condominio-jardins-do-mar' },
    update: {},
    create: {
      name: 'Condomínio Jardins do Mar',
      slug: 'condominio-jardins-do-mar',
      address: 'Avenida Oceânica, 250 - Praia Azul',
      contactName: 'Carlos Menezes',
      contactPhone: '(11) 99999-1000'
    }
  });

  const pool = await prisma.pool.upsert({
    where: { slug: 'piscina-adulto-demo' },
    update: {},
    create: {
      condominiumId: condominium.id,
      name: 'Piscina adulto',
      slug: 'piscina-adulto-demo',
      description: 'Piscina principal do condomínio',
      locationNote: 'Área de lazer central',
      idealChlorineMin: 1,
      idealChlorineMax: 3,
      idealPhMin: 7.2,
      idealPhMax: 7.8,
      idealAlkalinityMin: 80,
      idealAlkalinityMax: 120,
      idealHardnessMin: 200,
      idealHardnessMax: 400,
      idealTemperatureMin: 24,
      idealTemperatureMax: 30
    }
  });

  const records = [
    { measuredAt: new Date('2026-03-15T08:00:00Z'), responsibleName: 'João Souza', chlorine: 1.8, ph: 7.4, alkalinity: 98, hardness: 250, temperature: 27, productsApplied: 'Cloro granulado 180 g', observations: 'Água límpida.', photoPath: '/demo-pool.svg' },
    { measuredAt: new Date('2026-03-16T08:15:00Z'), responsibleName: 'João Souza', chlorine: 1.5, ph: 7.3, alkalinity: 102, hardness: 255, temperature: 28, productsApplied: 'Cloro 150 g + clarificante 50 ml', observations: 'Sem intercorrências.', photoPath: '/demo-pool.svg' },
    { measuredAt: new Date('2026-03-17T08:20:00Z'), responsibleName: 'Ana Martins', chlorine: 0.8, ph: 7.9, alkalinity: 78, hardness: 220, temperature: 31, productsApplied: 'Ajuste de pH e barrilha leve', observations: 'Necessário acompanhar novamente no fim do dia.', photoPath: '/demo-pool.svg' }
  ];

  await prisma.measurement.deleteMany({ where: { poolId: pool.id } });

  for (const record of records) {
    const statuses = computeMeasurementStatuses(pool, record);
    await prisma.measurement.create({
      data: {
        poolId: pool.id,
        ...record,
        ...statuses
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
