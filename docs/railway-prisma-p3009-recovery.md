# Runbook: correção segura do Prisma P3009 no Railway

Este runbook resolve erro **P3009** quando há migration falhada no banco de produção sem apagar dados.

## Contexto alvo
- Migration com problema: `20260328110000_professional_domain_expansion`
- Estratégia prioritária: marcar a migration antiga como `rolled back` via `prisma migrate resolve`, validar estado real do banco e só então reaplicar deploy.

## 1) Confirmar estado no banco alvo (produção)
No shell do serviço no Railway (ou local com `DATABASE_URL` de produção acessível):

```bash
npx prisma migrate status
```

Se houver P3009, confirme no histórico interno do Prisma:

```bash
npx prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
SELECT migration_name, started_at, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
WHERE migration_name = '20260328110000_professional_domain_expansion'
ORDER BY started_at DESC;
SQL
```

## 2) Inspecionar risco de aplicação parcial (sem destruir dados)
Antes de resolver, valide se objetos já foram criados parcialmente:

```bash
npx prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
SELECT t.typname AS enum_name
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typtype = 'e'
  AND n.nspname = 'public'
  AND t.typname = 'AdminUserRole';

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'AdminUser'
  AND column_name = 'role';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Measurement'
  AND column_name = 'measuredById';

SELECT conname
FROM pg_constraint
WHERE conname = 'Measurement_measuredById_fkey';

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'Measurement'
  AND indexname = 'Measurement_measuredById_idx';
SQL
```

## 3) Marcar migration falhada como rolled back (prioridade)
Com o nome exato da migration:

```bash
npx prisma migrate resolve --rolled-back "20260328110000_professional_domain_expansion"
```

> Isso não apaga dados. Apenas corrige o estado de controle do Prisma para permitir seguir com o deploy.

## 4) Revalidar e reaplicar migrations pendentes
```bash
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

## 5) Validar coerência migration x schema
Valide o schema:

```bash
npx prisma validate
```

Se você tiver uma URL de shadow DB PostgreSQL acessível, valide drift entre diretório de migrations e schema:

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "$SHADOW_DATABASE_URL" \
  --exit-code
```

## 6) Passo final para redeploy no Railway
1. Executar os passos 1–5 no ambiente com acesso ao banco de produção.
2. Confirmar que `npx prisma migrate status` não mostra falha pendente.
3. Fazer novo deploy no Railway.
4. Verificar logs de boot sem P3009.

## Observação de segurança
Se a migration antiga aplicou parcialmente objetos (ex.: enum criado, coluna criada, FK/index faltando), **não use reset** em produção.
- Primeiro normalize o estado (rollback lógico via `migrate resolve`).
- Em seguida aplique migration corrigida/idempotente em novo deploy.
- Só considere `migrate reset` fora de produção ou com plano explícito de restauração.
