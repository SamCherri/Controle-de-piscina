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
- **Banco relacional:** Prisma ORM com SQLite por padrão para desenvolvimento local.
- **Autenticação:** sessão segura baseada em cookie HTTP-only assinado com `jose`.
- **Uploads:** armazenamento local em `public/uploads`.
- **QR Code:** geração dinâmica com `qrcode`.
- **Gráficos:** `recharts`.
- **Validação:** `zod`.

> Em produção, basta trocar `DATABASE_URL` para um banco suportado pelo Prisma e apontar `NEXT_PUBLIC_APP_URL` para o domínio oficial.

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

## Regras de classificação

Cada piscina possui faixas ideais configuráveis.

Regra implementada:
- **Normal:** valor dentro do intervalo ideal.
- **Atenção:** valor levemente fora do intervalo ideal, dentro de tolerância de 15% da faixa.
- **Crítico:** valor fora da tolerância.

O status geral da piscina é calculado assim:
- se qualquer parâmetro for **crítico**, o status geral é **crítico**;
- senão, se qualquer parâmetro estiver em **atenção**, o status geral é **atenção**;
- caso contrário, é **normal**.

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

Copie `.env.example` para `.env`.

```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="change-this-secret-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Descrição

- `DATABASE_URL`: conexão do banco de dados.
- `AUTH_SECRET`: segredo usado para assinar sessões.
- `NEXT_PUBLIC_APP_URL`: URL pública usada na geração dos QR Codes.

## Instalação

```bash
npm install
cp .env.example .env
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
- `service worker` simples para cache do shell inicial;
- layout mobile-first e instalável no Android via navegador compatível.

## API

### `POST /api/auth/login`
Login administrativo via JSON.

### `POST /api/auth/logout`
Logout administrativo.

### `GET /api/measurements?poolId=...`
Lista medições de uma piscina.

### `POST /api/measurements`
Cria medição via JSON.

### `POST /api/uploads`
Upload de arquivo e retorno do caminho público.

## Produção

Checklist recomendado:

1. Configurar `AUTH_SECRET` forte.
2. Configurar `NEXT_PUBLIC_APP_URL` com domínio HTTPS.
3. Migrar `DATABASE_URL` para PostgreSQL ou MySQL suportado pelo Prisma.
4. Configurar storage externo para uploads, se desejar escalar.
5. Executar `npm run build` e `npm run start`.
6. Publicar atrás de proxy HTTPS.

## Observações de engenharia

- O upload local foi adotado por praticidade e baixa complexidade na primeira versão.
- A modelagem já suporta vários condomínios e várias piscinas por condomínio.
- O histórico preserva data/hora, responsável e timestamps de criação/atualização.
- A tela pública sempre exibe a medição mais recente disponível.

## Comandos úteis

```bash
npm run dev
npm run build
npm run lint
npm run prisma:seed
```
