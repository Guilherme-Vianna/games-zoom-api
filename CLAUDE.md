# Games Zoom — API

API REST do Games Zoom: contas com confirmacao de e-mail, listas de desejos (wishlists)
compartilhaveis e itens vindos da Steam. Deploy na Vercel. Consumida pelo repo
`games-zoom-ui` (Next.js RSC).

## Instrucoes para o Claude

Sempre que o usuario passar uma diretriz importante durante uma conversa (regra de
negocio, contrato de API, convencao de codigo que vale daqui pra frente), registrar
neste arquivo na secao mais relevante — nao so aplicar na tarefa da vez.

## Testes unitarios (OBRIGATORIO para logica de backend)

Toda funcao com logica nao-trivial (parsing de URL/AppID, geracao/validacao de token,
regras de acesso, montagem de payload/e-mail, validacoes zod com transform/refine)
**precisa** de teste `vitest` junto com a implementacao — nao deixar "pra depois".

- Extraia a logica pura para um modulo em `src/lib/<x>.ts` e teste em `src/lib/<x>.test.ts`.
  Os testes rodam sem banco e sem rede. Referencias: `steam.test.ts`, `jwt.test.ts`,
  `wishlist-access.test.ts`, `tokens.test.ts`, `email.test.ts`.
- Route handlers que dependem do Prisma: extraia a parte pura (regra de acesso,
  serializacao, parsing) e cubra os edge cases dela; o fluxo com banco e verificado
  por smoke manual (`curl` / a UI).
- **Rodar `pnpm test` (= `vitest run`) antes de considerar qualquer tarefa de backend
  pronta**, junto com `pnpm exec tsc --noEmit` e `pnpm build`.
- Cobrir sempre: entrada vazia/nula, formato inesperado, token expirado/adulterado,
  usuario sem permissao, e o cenario de regressao que motivou a mudanca.

## Stack

- **Next.js 16** (App Router) — so route handlers em `src/app/api/**`, sem UI.
- **Prisma 7** + **Neon Postgres** — driver adapter `@prisma/adapter-pg` (obrigatorio
  desde o Prisma 7). Client gerado em `src/generated/prisma` (gitignored).
- **jose** para assinar/validar o JWT de sessao (HS256, segredo `API_JWT_SECRET`).
- **bcryptjs** para hash de senha (custo 10).
- **zod 4** para validar todo body de request.
- **SendPulse** para e-mail transacional (confirmacao de conta).

## E-mail (SendPulse)

- `src/lib/email.ts`: `buildVerificationEmail` (puro, testado, escapa o nome) +
  `sendEmail` (transporte por `EMAIL_TRANSPORT`).
  - `console` (default): imprime o link no log — dev/preview.
  - `sendpulse`: `POST https://api.sendpulse.com/smtp/emails` com
    `Authorization: Bearer <SENDPULSE_API_KEY>` (a chave `sp_apikey_...` funciona
    direto como Bearer; alternativa OAuth via `SENDPULSE_CLIENT_ID/SECRET`).
    HTML vai em base64. A API responde 200 mesmo em erro logico -> checamos `result`.
- `register` e `resend` **nunca falham por causa do e-mail**: capturam o erro,
  logam, e devolvem `emailSent: false` / `sent: false` para o frontend avisar e
  oferecer reenvio.
- **Estado atual da conta SendPulse**: SMTP em modo desenvolvimento — os e-mails
  saem de `devtest@sendpulseemail.com` com "For development purposes only:" no
  assunto (mas **sao entregues**, smtp 250). Para produzir de verdade: no painel
  SendPulse, ativar o servico SMTP e verificar um dominio remetente (SPF/DKIM);
  entao ajustar `SENDPULSE_SENDER_EMAIL`. Unico remetente verificado hoje:
  `mataveli91@gmail.com`.

## Reenvio / conta nao confirmada

- `register` e **idempotente para conta nao confirmada**: se o e-mail existe mas
  `emailVerified == null`, atualiza nome/senha, apaga tokens antigos, gera um novo
  e reenvia (status 200). Se ja confirmada -> 409 "faca login".
- `resend` responde sempre generico (nao vaza se a conta existe), mas devolve
  `sent: boolean` para o toast.

## Contrato da API

Base: `/api`. Todas as respostas sao JSON. Erros: `{ "error": "mensagem pt-BR", ... }`
com status HTTP adequado (400 validacao simples, 401 sem auth, 403 sem permissao /
e-mail nao confirmado, 404, 409 conflito, 410 token expirado, 422 zod, 502 Steam fora).

| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| POST | `/auth/register` | nao | Cria conta (`emailVerified=null`) + e-mail. Idempotente p/ conta nao confirmada (200); 409 se ja confirmada. Retorna `{ email, emailSent }` |
| GET | `/auth/verify?token=` | nao | Confirma o e-mail (token single-use, expira em 24h) |
| POST | `/auth/resend` | nao | Reenvia o link. Resposta generica + `{ sent: boolean }` |
| POST | `/auth/login` | nao | `{ email, password }` -> `{ token, user }`. 403 `EMAIL_NOT_VERIFIED` se nao confirmou |
| GET | `/wishlists` | sim | Listas que eu possuo + em que colaboro |
| POST | `/wishlists` | sim | `{ name }` -> cria lista + 1 convite padrao (sem expiracao) |
| GET | `/wishlists/:id` | sim | Detalhe (itens, colaboradores, `access`; `invites` so p/ dono) |
| DELETE | `/wishlists/:id` | sim (dono) | Apaga a lista |
| POST | `/wishlists/:id/items` | sim (dono/colab) | `{ input }` = link Steam ou AppID -> busca na Steam e salva |
| DELETE | `/wishlists/:id/items/:itemId` | sim (dono ou autor) | Remove o item |
| GET | `/wishlists/:id/invites` | sim (dono) | Lista os links de convite |
| POST | `/wishlists/:id/invites` | sim (dono) | `{ expiry: "1d"\|"7d"\|"30d"\|"never" }` -> gera link |
| DELETE | `/wishlists/:id/invites/:inviteId` | sim (dono) | Revoga o link (`revokedAt`) |
| DELETE | `/wishlists/:id/collaborators/:userId` | sim | Dono remove qualquer um; colaborador remove a si (`:userId` = `me`) |
| GET | `/shared/:token` | opcional | Previa via convite. Revogado -> 404; expirado -> 200 `inviteState:"expired"` |
| POST | `/shared/:token/join` | sim | Entra via convite (410 se expirado/revogado). Incrementa `useCount` |

## Autenticacao

- Login devolve um JWT (`jose`, HS256, `sub` = user id, exp 30d). O frontend guarda
  esse token na sessao do next-auth e reapresenta em `Authorization: Bearer <token>`.
- `requireUser(req)` (`src/lib/auth-context.ts`) valida o Bearer, carrega o usuario e
  **exige `emailVerified`** (403 caso contrario). Use em todo handler autenticado.
- Nunca confie no client para permissao: `resolveWishlistAccess` decide dono/colaborador/
  nenhum a partir dos ids carregados do banco (`src/lib/wishlist-access.ts`, puro + testado).
- `loadWishlistForUser(id, userId)` (`src/lib/wishlist-repo.ts`) carrega a lista
  completa + resolve o acesso; `assertCanView` / `assertOwner` gates.

## Links de convite (WishlistInvite)

- Model `WishlistInvite`: `token @unique`, `expiresAt?` (null = nunca), `revokedAt?`,
  `useCount`. Uma lista tem N convites; ao criar uma lista ja nasce 1 convite "never".
- `inviteState({expiresAt, revokedAt}, now)` (`src/lib/tokens.ts`, puro + testado):
  `revoked` > `expired` > `active`. Presets de expiracao em `INVITE_EXPIRY_PRESETS`
  (`expiresAtFromPreset`).
- `/shared/:token` e `/join` resolvem via `WishlistInvite.token` (nao ha mais
  `Wishlist.shareToken`). Join so com convite `active`; incrementa `useCount` (transacao).
- Convites so aparecem no payload para o **dono** (o route zera `wishlist.invites`
  para os demais).

## Steam

- `parseSteamAppId(input)` (`src/lib/steam.ts`) aceita AppID puro, link da loja
  (com/sem querystring de rastreio, com/sem protocolo) e link da comunidade. Retorna
  `null` para qualquer coisa ambigua — **nunca** capturar `/app/<id>` de dominio nao-Steam.
- `mapAppDetails(raw, appId)` converte a resposta do endpoint publico `appdetails`
  (`?cc=br&l=brazilian`) no nosso shape; retorna `null` quando `success: false`.
- O `priceOverview` salvo em `WishlistItem` e um **snapshot** do momento em que o jogo
  foi adicionado — nao ha cron de atualizacao de preco ainda (proxima rodada, seria o
  papel de um Vercel Cron neste repo).
- Steam fora do ar -> 502 com mensagem amigavel; nunca deixar o erro cru vazar.

## CORS

- `src/proxy.ts` (nome novo do `middleware.ts` no Next 16) responde o preflight
  `OPTIONS` e injeta headers de CORS em toda resposta de `/api`. Origem permitida =
  env `CORS_ORIGIN` (a URL da UI). Os helpers `json()`/`error()` (`src/lib/http.ts`)
  tambem setam CORS.

## Banco / migrations

- `prisma.config.ts` usa `DIRECT_URL` (sem `-pooler`) para migrations — advisory locks
  nao passam pelo pooler do Neon (P1002).
- `DATABASE_URL` (com `-pooler`) e o que a app usa em runtime.
- **Migrations rodam automaticamente**: os scripts `dev` e `build` fazem
  `prisma generate && prisma migrate deploy` antes de subir/buildar. No dev isso
  aplica migrations pendentes ao abrir; na Vercel o `build` aplica em producao — sem
  passo manual. Para **criar** uma migration nova: `pnpm db:migrate` (= `prisma
  migrate dev`), commitar a pasta gerada em `prisma/migrations/`.
- Antes de qualquer migration destrutiva (`DROP`/`ALTER` de coluna) contra producao:
  `pg_dump` da `DIRECT_URL` primeiro e rodar `prisma migrate status`.
- `pnpm db:seed` cria `demo@games-zoom.local` / `gameszoom123` (ja verificado).

## Deploy na Vercel

- Root do projeto = este repo. Build command padrao (`pnpm build` ja roda
  `prisma generate && prisma migrate deploy`).
- Env vars obrigatorias: `DATABASE_URL`, `DIRECT_URL`, `API_JWT_SECRET`, `CORS_ORIGIN`,
  `APP_URL`, e (para e-mail real) `EMAIL_TRANSPORT=sendpulse` + `SENDPULSE_API_KEY`
  (ou `SENDPULSE_CLIENT_ID`/`SENDPULSE_CLIENT_SECRET`) + `SENDPULSE_SENDER_EMAIL`.
- `EMAIL_TRANSPORT=console` (default) so loga o link — util em preview/local.

## Convencoes de codigo

- Um route handler por recurso, `export const GET/POST/...` envolto em `handle()`
  (`src/lib/http.ts`), que converte `ZodError` -> 422 e `HttpError` -> status dado.
- Validar todo body com um schema de `src/lib/validations.ts`.
- Mensagens de erro voltadas ao usuario em **portugues**, sem jargao e sem vazar
  detalhe interno (stack, nome de tabela, existencia de e-mail).
- Prisma client sempre via `import { prisma } from "@/lib/prisma"` (singleton).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
