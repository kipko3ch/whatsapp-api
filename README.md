# Baileys WhatsApp API Platform

Unofficial WhatsApp automation MVP built with Next.js 14, TypeScript, Prisma, Postgres, Redis/BullMQ, and Baileys. It follows WhatsApp Business Cloud API-style route naming while keeping Baileys behind a provider interface.

## Run locally

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

For local development, Postgres is exposed on `localhost:15432` and Redis on `localhost:16379` to avoid collisions with other stacks. Inside Docker, the app still uses `postgres:5432` and `redis:6379`.

Seed login:

```text
admin@example.com / password
```

## Docker

```bash
docker compose up -d
```

The compose stack runs:

- `app` on port `3000`
- `postgres`
- `redis`

Health check:

```text
GET /api/health
```

## Required environment variables

- `DATABASE_URL`
- `REDIS_URL`
- `APP_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `API_KEY_PEPPER`
- `WEBHOOK_SIGNING_SECRET`
- `BAILEYS_LOG_LEVEL`
- `DEFAULT_DAILY_SEND_LIMIT`
- `DEFAULT_MESSAGE_DELAY_MIN_MS`
- `DEFAULT_MESSAGE_DELAY_MAX_MS`

## Coolify / Dockploy notes

- Use the Dockerfile or docker-compose.yml.
- Prefer external Neon, Supabase Postgres, or managed Postgres for production.
- Use managed Redis-compatible storage when possible.
- Persistent volume is only required for containerized Postgres/Redis. Baileys sessions, messages, contacts, jobs, API keys, webhooks, logs, and devices are stored in Postgres.
- Set strong unique values for `NEXTAUTH_SECRET`, `API_KEY_PEPPER`, and `WEBHOOK_SIGNING_SECRET`.
- Run `npx prisma migrate deploy` during deployment before starting the app.

## Safety warning

Baileys is unofficial and not the WhatsApp Business Cloud API. Misuse, spam, high sending velocity, or suspicious automation may cause device logout, restrictions, or bans. Use daily caps, randomized delays, opt-outs, blacklist checks, pause/resume controls, and human takeover.
