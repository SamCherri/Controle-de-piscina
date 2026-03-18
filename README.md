# Controle de Piscina para Condomínios

Sistema web completo para operação de piscinas em condomínios, consolidado a partir das iterações recentes do projeto sem perder funcionalidades já entregues. A versão atual preserva autenticação, dashboard, cadastro de condomínio e piscina, medições com foto, QR Code, página pública, PWA, gráficos, Prisma com PostgreSQL, migrations versionadas, proteção de rotas e validações reforçadas para deploy compatível com Railway.

## Stack adotada

- **Frontend + backend:** Next.js `14.2.35` com App Router.
- **UI:** React 18 + Tailwind CSS.
- **Banco relacional:** Prisma ORM com PostgreSQL.
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
- `.env.example` pronto para ambiente local/ Railway.
- Fluxo de deploy documentado para Railway com `prisma migrate deploy`.

### Autenticação e proteção

A autenticação foi consolidada em três camadas para evitar mistura de responsabilidades:

- `lib/password.ts`: hash e verificação de senha.
- `lib/session.ts`: assinatura, leitura e limpeza da sessão JWT em cookie.
- `lib/auth.ts`: autenticação do usuário e proteção de rotas/pontos de API.

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
- faz cache de app shell e assets estáticos;
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
```

### Descrição

- `DATABASE_URL`: conexão PostgreSQL usada pelo Prisma.
- `AUTH_SECRET`: segredo usado para assinar a sessão JWT.
- `NEXT_PUBLIC_APP_URL`: base pública usada na geração dos QR Codes.

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

Criadas pelo seed:

- **E-mail:** `admin@piscina.com`
- **Senha:** `admin123`

## Seed inicial

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

Fluxo recomendado:

1. Provisionar um banco PostgreSQL no Railway.
2. Configurar `DATABASE_URL`, `AUTH_SECRET` e `NEXT_PUBLIC_APP_URL`.
3. Executar `npm run prisma:migrate:deploy`.
4. Executar `npm run build`.
5. Publicar a aplicação com `npm run start`.

## Comandos úteis

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```
