# Auditoria ponta a ponta do fluxo QR code -> página pública -> foto

## Causa raiz mais provável

A causa raiz mais provável do sintoma "a foto não aparece ao ler o QR code" é a combinação de **política de cache agressiva da rota pública da foto** com **versionamento de URL baseado apenas em `measuredAt`**. Quando a mesma medição é editada e a foto é trocada sem alterar a data/hora da medição, a URL pública da imagem continua igual e clientes podem reutilizar conteúdo antigo, inclusive uma resposta desatualizada. Isso afeta especialmente celulares que acessam a página pública repetidamente pelo QR code.

## Evidências no código

1. A rota pública da foto respondia com `Cache-Control: public, max-age=31536000, immutable, no-transform`, o que é seguro apenas para URLs totalmente versionadas.
2. As telas pública, administrativa e de edição usavam `cacheKey` baseado em `measuredAt`, não em `updatedAt`.
3. O modelo `Measurement` já possui `updatedAt`, então havia um identificador de mutação disponível, mas não estava sendo usado para versionar a foto.
4. O sistema ainda mantém compatibilidade com `photoPath` legado, o que adiciona outro risco operacional: fotos antigas podem sumir após deploy/restart se ainda dependerem de filesystem ou origem externa.

## Auditoria ponta a ponta

### 1. Geração do QR code
- O QR code é gerado na página administrativa da piscina a partir de uma URL pública resolvida pelo servidor.
- O projeto já tenta proteger contra hosts privados/locais e exibe warning quando a base pública não é compartilhável.
- Risco operacional: sem `NEXT_PUBLIC_APP_URL`/`APP_URL` corretos, o QR pode apontar para host inadequado.

### 2. Página pública
- A página pública busca a piscina por `slug` e exibe apenas a medição mais recente.
- A foto dessa medição é carregada por uma rota pública `/api/measurements/:id/photo`.
- Se a última medição não tiver foto, a página não tenta fallback para uma medição anterior com foto.

### 3. Entrega da foto
- Para fotos persistidas em `photoData`, a API retorna os bytes da imagem diretamente.
- Para registros legados, a API tenta recuperar a foto a partir de `photoPath` e, quando consegue, faz auto-backfill para o banco.
- Se o `photoPath` legado apontar para storage efêmero perdido, a foto continuará indisponível publicamente até ser reenviada.

### 4. Persistência do upload
- O formulário envia `multipart/form-data`.
- O servidor valida tipo/extensão/conteúdo e grava a imagem no banco para novos uploads.
- Portanto, o fluxo principal novo está correto; o maior problema é frescor/entrega e legado, não ausência de persistência no caminho principal.

## Como empresas maduras implementam esse fluxo

1. **Domínio público canônico** para o QR code, validado no deploy.
2. **Armazenamento durável** de mídia, geralmente object storage + CDN ou DB apenas para arquivos pequenos.
3. **URLs de mídia versionadas** com hash/revision/`updatedAt`.
4. **Cache forte apenas em URL imutável**.
5. **Monitoramento sintético** validando a sequência QR/public page/photo.
6. **Backfill total de legado**, evitando dependência permanente de `photoPath` local.

## Correção aplicada neste repositório

1. O `cacheKey` das fotos foi alterado para usar `updatedAt`.
2. A rota da foto foi endurecida para usar revalidação (`must-revalidate`) em vez de `immutable` numa URL que pode mudar de conteúdo ao longo do tempo.

## Próximos passos operacionais recomendados

1. Executar backfill das fotos legadas e medir quantos registros ainda dependem de `photoPath`.
2. Fixar `NEXT_PUBLIC_APP_URL` com o domínio público real do deploy.
3. Adicionar um check automatizado que abra a página pública e valide `200` na foto da última medição.
4. Considerar object storage/CDN se o volume de fotos crescer.
