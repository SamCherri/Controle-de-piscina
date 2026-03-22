# Controle de Piscina para Condomínios

Sistema web completo para operação de piscinas em condomínios, consolidado a partir das iterações recentes do projeto sem perder funcionalidades já entregues. A versão atual preserva autenticação, dashboard, cadastro de condomínio e piscina, medições com foto, QR Code, página pública, PWA, gráficos, Prisma com PostgreSQL, migrations versionadas, proteção de rotas e validações reforçadas para deploy compatível com Railway.

## Stack adotada

- **Frontend + backend:** Next.js `14.2.35` com App Router.
- **UI:** React 18 + Tailwind CSS.
- **Banco relacional:** Prisma ORM com PostgreSQL.
- **Configuração Prisma:** `prisma.config.ts` apontando schema, migrations versionadas e seed.
- **Autenticação:** cookie HTTP-only assinado com JWT (`jose`).
- **Criptografia de senha:** `bcryptjs`, isolado em utilitário dedicado.
- **Uploads:** persistência local em `public/uploads` com utilitário dedicado, validação de tipo, extensão e tamanho.
- **QR Code:** geração dinâmica com `qrcode`.
- **Gráficos:** `recharts`.
- **Validação:** `zod` com normalização e refinamentos adicionais.
- **PWA:** `manifest.webmanifest`, ícones e service worker com cache versionado e exclusão explícita de APIs.

## Funcionalidades preservadas

### Área administrativa

- Login seguro.
- Proteção de rotas do dashboard.
- Dashboard com visão consolidada por condomínio e piscina.
- Cadastro de condomínio.
- Cadastro de piscina.
- Configuração de faixas ideais por piscina.
- Registro, edição e exclusão de medições.
- Upload de foto em medições.
- Gráficos de acompanhamento.
- Histórico operacional completo.
- Geração de QR Code por piscina.

### Área pública

- Página pública por `slug` da piscina.
- Exibição da medição mais recente.
- Exibição de foto, parâmetros, observações e status geral.
- Compatibilidade com QR Code impresso/afixado no condomínio.

## Consolidação técnica aplicada

### Banco de dados e deploy

- Prisma em **PostgreSQL**.
- Migration inicial versionada em `prisma/migrations/20260318120000_init/migration.sql`.
- `migration_lock.toml` configurado para PostgreSQL.
- `prisma.config.ts` consolidado para schema, migrations e seed sem depender da configuração legada em `package.json`.
- `package.json` apenas com scripts (`build`, `prisma:migrate:deploy`, `prisma:seed` etc.), sem bloco legado duplicado de configuração Prisma.
- `.env.example` pronto para ambiente local/ Railway.
- Fluxo de deploy documentado para Railway com `prisma migrate deploy`.

### Autenticação e proteção

A autenticação foi consolidada em três camadas para evitar mistura de responsabilidades, com bootstrap resiliente do administrador padrão no startup e também na primeira tentativa real de login:

- `lib/password.ts`: hash e verificação de senha.
- `lib/session.ts`: assinatura, leitura e limpeza da sessão JWT em cookie.
- `lib/auth.ts`: autenticação do usuário, criação sob demanda do admin padrão e proteção de rotas/pontos de API.

Proteções preservadas:

- cookie `HTTP-only`;
- `sameSite=lax`;
- `secure` em produção;
- proteção de páginas administrativas;
- proteção explícita de APIs sensíveis (`/api/measurements`, `/api/uploads`, `/api/auth/logout`);
- sem enumeração de usuário no login.

### Upload endurecido

O upload usa `lib/uploads.ts` para centralizar:

- limite de **5 MB**;
- formatos permitidos **JPG, PNG e WEBP**;
- validação simultânea de MIME type e extensão;
- nome de arquivo aleatório com `UUID`;
- persistência controlada em `public/uploads`.

### PWA e service worker

A versão consolidada do service worker:

- usa cache versionado;
- remove caches antigos automaticamente;
- não intercepta nem armazena respostas de `/api`;
- faz cache apenas de assets estáticos e rotas públicas apropriadas;
- não armazena HTML do dashboard autenticado;
- aplica fallback de navegação sem afetar dados administrativos.

## Estrutura principal

```bash
app/
  (auth)/login
  (dashboard)/...
  api/
  public/piscinas/[slug]
components/
  forms/
lib/
  auth.ts
  password.ts
  session.ts
  status.ts
  uploads.ts
  validators.ts
prisma.config.ts
prisma/
  migrations/
public/
  icons/
  uploads/
```

## Variáveis de ambiente

Copie `.env.example` para `.env`.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/controle_de_piscina?schema=public"
AUTH_SECRET="change-this-secret-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DEFAULT_ADMIN_EMAIL="admin@piscina.com"
DEFAULT_ADMIN_PASSWORD="admin123"
DEFAULT_ADMIN_NAME="Administrador"
```

### Descrição

- `DATABASE_URL`: conexão PostgreSQL usada pelo Prisma.
- `AUTH_SECRET`: segredo usado para assinar a sessão JWT.
- `NEXT_PUBLIC_APP_URL`: base pública usada na geração dos QR Codes.
- `DEFAULT_ADMIN_EMAIL`: e-mail do administrador padrão criado automaticamente.
- `DEFAULT_ADMIN_PASSWORD`: senha do administrador padrão criado automaticamente.
- `DEFAULT_ADMIN_NAME`: nome exibido para o administrador padrão.

## Instalação local

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev
```

A aplicação ficará disponível em:

- Admin: `http://localhost:3000/login`
- Público demo: `http://localhost:3000/public/piscinas/piscina-adulto-demo`

## Credenciais iniciais

Criadas pelo seed e também pelo bootstrap automático caso o banco ainda não tenha administrador:

- **E-mail:** `admin@piscina.com`
- **Senha:** `admin123`

Você também pode sobrescrever essas credenciais definindo `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` e `DEFAULT_ADMIN_NAME` no ambiente antes de iniciar a aplicação.

## Seed inicial

O projeto está configurado com o seed centralizado em `prisma.config.ts`:

```bash
prisma db seed
```

Esse comando lê `schema`, `migrations`, `seed` e `datasource url` diretamente de `prisma.config.ts`, sem depender de bloco legado no `package.json`.

ou via script:

```bash
npm run prisma:seed
```

O seed cria:

- 1 usuário administrador;
- 1 condomínio de exemplo;
- 1 piscina de exemplo;
- 3 medições com status diferentes;
- imagem pública inicial demo.

## API

### `POST /api/auth/login`
Login administrativo via JSON, com resposta genérica para credenciais inválidas.

### `POST /api/auth/logout`
Logout administrativo com sessão válida.

### `GET /api/measurements?poolId=...`
Lista medições de uma piscina para sessão autenticada.

### `POST /api/measurements`
Cria medição via JSON para sessão autenticada.

### `POST /api/uploads`
Upload de imagem validado e protegido por sessão, com retorno do caminho público.

## Deploy no Railway

Fluxo recomendado para evitar o erro `The table public.AdminUser does not exist in the current database` sem acoplar migration ao build:

1. Provisionar um banco PostgreSQL no Railway.
2. Configurar `DATABASE_URL`, `AUTH_SECRET` e `NEXT_PUBLIC_APP_URL`.
3. Definir o **Build Command** como `npm run build`.
4. Definir o **Pre-deploy Step** como `npm run prisma:migrate:deploy`.
5. Definir o **Start Command** como `npm run start`.
6. Opcionalmente, executar `npm run prisma:seed` uma vez para carregar os dados iniciais.

### Por que isso resolve o problema de tabela ausente?

O erro em produção acontecia porque a migration precisava rodar antes da aplicação iniciar, mas isso não precisa acontecer dentro do build. A configuração correta no Railway separa as responsabilidades:

1. **Pre-deploy Step:** `prisma migrate deploy`
2. **Build Command:** `prisma generate && next build`
3. **Start Command:** `next start`

Assim, a tabela `AdminUser` e as demais estruturas do schema passam a existir antes do deploy finalizar, enquanto o build continua responsável apenas por gerar o Prisma Client e compilar a aplicação Next.js.

## Comandos úteis

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```
