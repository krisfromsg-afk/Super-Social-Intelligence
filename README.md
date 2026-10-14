# Super Social Intelligence (SSI)

**Spider Hubs' AI-first omnichannel customer intelligence platform — under development.**

SSI aims to combine a unified social inbox, AI Agent/Copilot/Autopilot with human override, customer context, business knowledge/RAG and authorized social channel integrations.

## What is merged?

**Application source is not yet merged to `main`.** The active application and partial Phase 1/Phase 2 code currently live in the [canonical clean-parent draft PR #5](https://github.com/krisfromsg-afk/Super-Social-Intelligence/pull/5). Prior Foundation/Inbox PRs #1/#2 were closed without merging because their history included a disputed commercial-license subtree.

- **Foundation:** Source snapshot, early SSI branding, Inbox base and TypeScript/Next.js build are available on the PR #5 branch; not production accepted.
- **Inbox Phase 2:** Outgoing sender badges, actual automation message activity, indefinite Human Only toggle with re-enable and focused tests are in development; three-state approval mode and verified LLM/RAG traces remain unimplemented.
- **Personality Studio and Smart Knowledge Hub:** Planned, not yet delivered as full SSI features.
- **Deployment/live platform OAuth:** Not certified.

See [SSI delivery status](docs/ssi/PHASE_STATUS.md), [master plan](docs/ssi/MASTER_PLAN.md), [Phase 2 acceptance plan](docs/ssi/PHASE02_COMPLETION_PLAN.md), [RAG architecture](docs/ssi/RAG_ARCHITECTURE.md), and [upstream policy](docs/ssi/UPSTREAM_POLICY.md).

## Local development (experimental)

The canonical PR branch has an opt-in local Docker stack. On a **fresh development machine only**, run `pnpm ssi:bootstrap` to generate a private `.env` with distinct random credentials, set `PLATFORM_ADMIN_EMAIL` in `.env`, then run `docker compose -f docker-compose.dev.yml up --build -d`. The app health endpoint is `http://localhost:3123/api/health`.

See [local bootstrap and troubleshooting](docs/ssi/LOCAL_DEV_BOOTSTRAP.md) before starting. The generated environment is **not** a production configuration. Do not run this stack against an existing customer database; migration compatibility and live integrations are still unverified.

## Source and licensing

The project builds on Community Edition source from [ChatbotX](https://github.com/ChatbotXIO/ChatbotX) with retained MIT/third-party notices. Certain source areas have different licensing; no restricted source should be copied into SSI without permission. The [commercial-source blocker](https://github.com/krisfromsg-afk/Super-Social-Intelligence/issues/4) is still open pending provenance verification. Spider Hubs-authored features are developed separately.

Do not commit secrets, OAuth tokens or production customer data.
