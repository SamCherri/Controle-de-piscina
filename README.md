# Controle de Piscina para Condomínios

Sistema web completo, responsivo e preparado para produção para controle operacional de piscinas em condomínios, com:

- área administrativa com autenticação;
- cadastro multi-condomínio e multi-piscina;
- lançamento de medições com foto, produtos aplicados e observações;
- classificação automática por faixas ideais configuráveis;
- gráficos e histórico completo por piscina;
- área pública pronta para QR Code;
- experiência PWA instalável no Android via navegador.

## Stack adotada

- **Frontend + backend:** Next.js 14 com App Router.
- **UI:** React + Tailwind CSS.
- **Banco relacional:** PostgreSQL com Prisma ORM.
- **Autenticação:** sessão segura baseada em cookie HTTP-only assinado com `jose`.
- **Uploads:** armazenamento local em `public/uploads` (adequado para MVP e instâncias únicas; em escala, use object storage).
- **QR Code:** geração dinâmica com `qrcode`.
- **Gráficos:** `recharts`.
- **Validação:** `zod` com refinements para regras de negócio e limites plausíveis.
- **Validação de imagem:** `sharp`, com whitelist estrita de JPG, JPEG, PNG e WEBP.

> O projeto está orientado para deploy no **Railway com PostgreSQL**. Em produção, as variáveis devem ser gerenciadas no painel do Railway.

## Funcionalidades entregues

### Área administrativa

- Login seguro.
- Cadastro de condomínio.
- Cadastro de piscina.
- Configuração de limites ideais por piscina para:
  - cloro;
  - pH;
  - alcalinidade;
  - dureza cálcica;
  - temperatura.
- Registro de medição com:
  - data e hora;
  - responsável;
  - cloro;
  - pH;
  - alcalinidade;
  - dureza cálcica;
  - temperatura;
  - produtos aplicados;
  - observações;
  - foto.
- Edição e exclusão de registros.
- Histórico completo por piscina.
- Dashboard com status atual.
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

## Segurança e robustez aplicadas

- Rotas administrativas sensíveis exigem sessão tanto no `middleware` quanto dentro dos `route handlers`.
- APIs protegidas:
  - `GET /api/measurements`
  - `POST /api/measurements`
  - `POST /api/uploads`
- Login com resposta padronizada para evitar enumeração de usuários: `Credenciais inválidas.`
- Upload endurecido com validação por MIME, extensão, tamanho, arquivo vazio e inspeção real de imagem.
- Service worker restrito a assets estáticos e conteúdo público, sem cache agressivo de painel autenticado ou APIs.
- Seed desacoplado do runtime web: hashing de senha movido para `lib/password.ts`.

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
public/
  icons/
  uploads/
```

## Variáveis de ambiente

### Produção no Railway

Defina as variáveis diretamente no serviço da aplicação no Railway:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/railway?schema=public"
AUTH_SECRET="gere-um-segredo-forte-com-pelo-menos-32-caracteres"
NEXT_PUBLIC_APP_URL="https://seu-dominio-ou-url-do-railway"
```

### Desenvolvimento local

Se desejar rodar localmente, copie `.env.example` para `.env` e aponte para um PostgreSQL local ou remoto compatível.

### Descrição das variáveis

- `DATABASE_URL`: conexão PostgreSQL usada pelo Prisma e pela aplicação.
- `AUTH_SECRET`: segredo usado para assinar sessões; em produção deve ser forte e exclusivo.
- `NEXT_PUBLIC_APP_URL`: URL pública usada para gerar os QR Codes.

## Instalação local com PostgreSQL

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
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

## Fluxos principais

### 1. Cadastro operacional

1. Entrar na área administrativa.
2. Cadastrar o condomínio.
3. Cadastrar a piscina.
4. Definir faixas ideais.
5. Registrar medições periódicas.
6. Acompanhar o histórico, gráficos e status.

### 2. Consulta pública por QR Code

1. Abrir a tela da piscina no painel administrativo.
2. Exibir ou imprimir o QR Code.
3. Moradores e administradora acessam a página pública da piscina.

## PWA

A aplicação inclui:

- `manifest.webmanifest`;
- ícones do app;
- `service worker` focado em assets estáticos essenciais;
- layout mobile-first e instalável no Android via navegador compatível.

## API

### `POST /api/auth/login`
Login administrativo via JSON.

### `POST /api/auth/logout`
Logout administrativo.

### `GET /api/measurements?poolId=...`
Lista medições de uma piscina. Requer sessão válida.

### `POST /api/measurements`
Cria medição via JSON. Requer sessão válida.

### `POST /api/uploads`
Upload seguro de imagem e retorno do caminho público. Requer sessão válida.

## Deploy no Railway

### 1. Criar os serviços

- Crie um projeto no Railway.
- Adicione um serviço **PostgreSQL**.
- Adicione um serviço para a aplicação Next.js apontando para este repositório.

### 2. Configurar variáveis

No serviço da aplicação, configure:

- `DATABASE_URL`: use a connection string do PostgreSQL fornecida pelo Railway.
- `AUTH_SECRET`: gere uma chave forte.
- `NEXT_PUBLIC_APP_URL`: use a URL pública final da aplicação.

### 3. Build e start

Comandos recomendados no Railway:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start
```

> Em produção, prefira `prisma migrate deploy` em vez de `prisma migrate dev`.

> As migrations do Prisma devem ser versionadas no repositório e já estão preparadas para aplicação via `prisma migrate deploy` no Railway.

### 4. Uploads em produção

O projeto mantém uploads em `public/uploads` para preservar o fluxo funcional atual. Em Railway, isso funciona apenas enquanto os arquivos permanecerem na instância ativa. Para produção com persistência durável e múltiplos deploys, substitua por object storage (por exemplo, S3, Cloudflare R2 ou Supabase Storage) sem alterar o restante da lógica de medições.

## Observações de engenharia

- O projeto está modelado para PostgreSQL como base principal.
- A modelagem suporta vários condomínios e várias piscinas por condomínio.
- O histórico preserva data/hora, responsável e timestamps de criação/atualização.
- A tela pública sempre exibe a medição mais recente disponível.
- As validações impedem limites invertidos, parâmetros negativos e valores fora de faixas plausíveis.

## Comandos úteis

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:seed
npx prisma migrate dev --name init
npx prisma migrate deploy
```
