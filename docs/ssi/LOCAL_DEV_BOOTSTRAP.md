# SSI local development bootstrap (experimental)

**Status: local developer trial only. Not a production deployment recipe.**

This guide applies to the application source on `feat/ssi-clean-history-rebuild` (draft PR #5), not `main`. The license/provenance blocker (#4), actual PostgreSQL upgrade and rollback, approval outbox and live OAuth/webhook E2E remain unresolved. Never point this compose stack at real customer data.

## Prerequisites

- Docker Engine / Docker Desktop with Compose v2 (and capacity to build Linux/amd64 images).
- Node.js 24 or newer and pnpm as pinned by the repository package manager.
- Free ports 3123, 1999, 5432, 6379, 9000, 9001, 8025, 1025 and 8080, or a deliberate local port override.

## Fresh, isolated environment

```bash
git checkout feat/ssi-clean-history-rebuild
corepack enable
pnpm ssi:bootstrap
# EDIT .env and set PLATFORM_ADMIN_EMAIL to your development account
pnpm ssi:doctor
# When services are running, add --live to validate actual connections:
# pnpm ssi:doctor --live
docker compose -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.dev.yml ps
curl -f http://localhost:3123/api/health
```

The bootstrap script **refuses to overwrite** an existing `.env` and creates a mode-0600 file with unique local auth, encryption, database, storage, executor and realtime secrets. Its credentials are for testing only. Never check `.env` into Git, publish screenshots containing its values, or reuse the secrets in production.

The root `.env.example` uses `localhost` for host-side tools. The development Compose overlay replaces `DATABASE_URL`, `REDIS_URL` and `S3_ENDPOINT` with Docker service DNS for builder, worker and realtime. The realtime server resolves its builder-origin checks through `http://builder:3000`.

The builder image runs migrations but **does not create any demo user or shared-password account**. After the health check, open `http://localhost:3123/auth/sign-up` and create your own account, then sign in. Never reuse old public demo credentials. Use **a new disposable database volume** only; schema migrations were not certified on existing production data. The open-source license/source review and migration checks must be independently completed before any release.

## Troubleshooting and acceptance

```bash
docker compose -f docker-compose.dev.yml logs --tail=200 builder worker realtime
pnpm install --frozen-lockfile
pnpm --filter @chatbotx.io/database db:check-drift
pnpm --filter builder check-types
pnpm --filter worker check-types
pnpm --filter builder test
pnpm --filter worker test
```

If the health endpoint is unavailable, inspect migration/seed, PostgreSQL credentials, Redis and storage logs before changing source. Build/test success does not prove OAuth, Meta channel permissions, multi-tenant protections or delivery race safety. The external social integrations need separate developer accounts, public HTTPS callback URLs, approved scopes and live E2E evidence.

`docker compose -f docker-compose.dev.yml down` stops services while retaining data. **`down -v` irreversibly deletes the compose-managed local volumes** and must only be used against disposable development data.

## Known limitations

- There is no certified in-place production database migration or rollback.
- Copilot is send-disabled, not a durable draft/approval queue; outgoing AI messages do not yet have an atomic outbox claim.
- Personality Studio and Knowledge Hub/RAG remain incomplete SSI product features.
- No live provider OAuth/webhook or real social-account integration is implied by the local health check.

### Configuration diagnostic

Run `pnpm ssi:doctor` to check Node and the local `.env` configuration without showing secret values. Warnings indicate missing optional operator setup; errors fail the command. `pnpm ssi:doctor --live` additionally checks TCP connectivity to the configured PostgreSQL/Redis/object storage and calls the builder `/api/health` endpoint. This is a local operator aid, **not** production security certification; `--strict` makes warnings fatal for an operator-controlled readiness gate.

### Migration note: no built-in demo login

The previous upstream seed created a predictable verified demo account with a known password. SSI deliberately removed this behavior. On a fresh local stack, create the first user with the sign-up page; the operator's `PLATFORM_ADMIN_EMAIL` must match the desired administrator's email. Already-existing databases are **not altered** by this change; if they previously contained demo users, the operator must audit and disable those accounts separately. The `db:seed` command is now a compatibility no-op and does not add users or workspaces.
