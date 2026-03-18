# Controle de Piscina para Condomínios

Sistema web completo, responsivo e preparado para produção para controle operacional de piscinas em condomínios, com foco em manter o deploy compatível com Railway + PostgreSQL sem abrir mão das funcionalidades já implementadas.

## Stack adotada

- **Frontend + backend:** Next.js 14 com App Router.
- **UI:** React + Tailwind CSS.
- **Banco relacional:** Prisma ORM com PostgreSQL.
- **Autenticação:** sessão segura baseada em cookie HTTP-only assinado com `jose`.
- **Uploads:** armazenamento local em `public/uploads`, com validação de tipo e tamanho.
- **QR Code:** geração dinâmica com `qrcode`.
- **Gráficos:** `recharts`.
- **Validação:** `zod`.
- **PWA:** `manifest.webmanifest`, ícones e service worker com cache controlado do app shell.

> Para produção no Railway, configure `DATABASE_URL`, `AUTH_SECRET` e `NEXT_PUBLIC_APP_URL` com os valores do ambiente final antes de executar as migrations.

## Funcionalidades entregues

### Área administrativa

- Login seguro.
- Proteção de rotas do dashboard por cookie de sessão.
- Cadastro de condomínio.
- Cadastro de piscina.
- Configuração de limites ideais por piscina para cloro, pH, alcalinidade, dureza cálcica e temperatura.
- Registro de medição com data/hora, responsável, foto, produtos aplicados e observações.
- Edição e exclusão de registros.
- Histórico completo por piscina.
- Dashboard com status atual consolidado.
- Gráficos de acompanhamento.
- Geração de QR Code por piscina.

### Área pública por QR Code

- Nome do condomínio.
- Identificação da piscina.
- Foto mais recente.
- Data e hora da última atualização.
- Nome do responsável.
- Cloro atual.
- pH atual.
- Alcalinidade atual.
- Dureza cálcica atual.
- Temperatura atual.
- Produtos aplicados.
- Observações.
- Status visual geral.
- Mensagem automática: normal, atenção ou crítico.

## Segurança e validações preservadas

- Autenticação com cookie `HTTP-only`, `sameSite=lax` e `secure` em produção.
- Validações com `zod` para login, condomínio, piscina e medições.
- Upload de imagem limitado a **5 MB** e aos formatos **JPG, PNG e WEBP**.
- Service worker sem interceptar chamadas de API, evitando cache indevido de dados administrativos.
- Estrutura pronta para Prisma + PostgreSQL com migrations versionadas.

## Estrutura do projeto

```bash
app/
  (auth)/login
  (dashboard)/...
  api/
  public/piscinas/[slug]
components/
  forms/
lib/
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

- `DATABASE_URL`: string de conexão do PostgreSQL usada pelo Prisma.
- `AUTH_SECRET`: segredo usado para assinar sessões.
- `NEXT_PUBLIC_APP_URL`: URL pública usada na geração dos QR Codes.

## Instalação local

```bash
npm install
cp .env.example .env
npm run prisma:generate
npx prisma migrate deploy
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
Login administrativo via JSON.

### `POST /api/auth/logout`
Logout administrativo com sessão válida.

### `GET /api/measurements?poolId=...`
Lista medições de uma piscina para sessão autenticada.

### `POST /api/measurements`
Cria medição via JSON para sessão autenticada.

### `POST /api/uploads`
Upload de imagem validado e protegido por sessão, com retorno do caminho público.

## PWA

A aplicação inclui:

- `manifest.webmanifest`;
- ícones do app;
- service worker com atualização de versão, limpeza de caches antigos e fallback apenas para navegação;
- layout mobile-first e instalável no Android via navegador compatível.

## Deploy no Railway

Fluxo recomendado:

1. Provisionar um banco PostgreSQL.
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
