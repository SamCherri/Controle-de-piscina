import { defineConfig, env } from 'prisma/config';

const defaultDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/controle_de_piscina?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts'
  },
  engine: 'classic',
  datasource: {
    url: process.env.DATABASE_URL ? env('DATABASE_URL') : defaultDatabaseUrl
  }
});
