# Games Zoom — API

API REST (Next.js 16 route handlers + Prisma 7 + Neon Postgres) para o Games Zoom:
uma wishlist da Steam compartilhavel entre amigos.

## Rodando local

```bash
pnpm install
cp .env.example .env      # ajuste DATABASE_URL / DIRECT_URL / API_JWT_SECRET
pnpm dev                  # aplica migrations pendentes + sobe em http://localhost:3001
pnpm db:seed              # usuario demo (opcional): demo@games-zoom.local / gameszoom123
pnpm test                 # testes unitarios
```

O banco e um Neon Postgres (nao precisa de Postgres local). `pnpm dev` e `pnpm build`
rodam `prisma migrate deploy` automaticamente. Para criar uma migration nova:
`pnpm db:migrate`.

## Deploy na Vercel

1. Importe este repo na Vercel.
2. Crie um Postgres no [Neon](https://neon.tech) e configure `DATABASE_URL` (host com
   `-pooler`) e `DIRECT_URL` (host sem `-pooler`).
3. Configure `API_JWT_SECRET`, `CORS_ORIGIN` (URL da UI), `APP_URL` (URL da UI),
   e o e-mail (`EMAIL_TRANSPORT=sendpulse` + credenciais SendPulse).
4. Deploy. `pnpm build` roda `prisma migrate deploy` automaticamente.

Veja `CLAUDE.md` para o contrato completo da API e convencoes.
