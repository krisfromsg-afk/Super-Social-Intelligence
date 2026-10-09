# Super Social Intelligence — Master Implementation Plan

Status: APPROVED PRODUCT DIRECTION / IMPLEMENTATION IN PROGRESS
Maintainer: Spider Hubs
Target: krisfromsg-afk/Super-Social-Intelligence
Upstream: ChatbotXIO/ChatbotX (MIT Community sources only)
Pinned upstream checkpoint: f1ca4a8f74cc08ca68d601ba2ce0e58bd9c5e67c (2026-10-09)

## Non-negotiables

1. AI-first: no flow canvas needed to launch a helpful AI Agent.
2. All authorized channels appear in one real-time inbox. Customers' inbound messages and the actual outgoing AI/human replies must be visible in conversation chronology.
3. Human-only / AI-Copilot (draft approval) / AI-Autopilot (approved auto-send) modes; handover pauses AI reliably.
4. Customer-defined AI identities, compiled from natural-language briefs into editable, versioned personas.
5. Grounded RAG over files, documents, structured tables, and approved live tools. Verified retrieval citations and no invented inventory/prices.
6. Workspace/tenant isolation throughout credentials, retrieval, memory, contacts, logs, and tools.
7. Official channel APIs only; scopes, approvals, and messaging windows must be validated per account.
8. Keep Community MIT provenance; never import proprietary enterprise folder; retain upstream MIT copyright.
9. Upstream security patches remain consumable via isolated community snapshot sync + source review; never merge upstream unfiltered.
10. Use modular, documented APIs, data migrations and tests to allow future channels, web/mobile and enterprise features.

## Decisions: keep, hide, extend, create

| Area | Decision | Delivery |
| --- | --- | --- |
| Next.js / React / Turbo / TypeScript | KEEP | Avoid framework rewrites |
| PostgreSQL / Drizzle / pgvector | KEEP | Backward-compatible schema migrations |
| Redis / BullMQ / realtime | KEEP | Add idempotency and monitoring tests |
| Facebook Messenger / Instagram / TikTok / Threads / WhatsApp / Zalo / Telegram / webchat / SMTP | KEEP + AUDIT | Official channel authorization matrix & contract tests |
| CRM, contacts, message archive | KEEP + EXTEND | Add cross-account identities, consent & segment-scoped memory |
| Inbox | UPGRADE | Chatwoot-like 3-column UI, AI labels, traces, human control |
| Agent worker/model gateway/MCP | KEEP + UPGRADE | Persona composition, bounded tool-calling, policies & budgets |
| File embeddings / AI Knowledge | KEEP + REBUILD UX | Hybrid retrieval, citations, ingestion jobs and structured records |
| Visual flow builder | HIDE FROM PRIMARY ONBOARDING | Retain advanced automation in separate tab |
| Broadcast/sequences/AB tests | KEEP AS OPTIONAL | Respect policy / messaging windows |
| Minigames, QR growth gimmicks, ads | DEFER | No P0 investment; do not indiscriminately delete dependencies |
| Commercial enterprise features | EXCLUDE | Independently implement only needed MIT-compatible replacements |
| Billing/mobile/publishing | FUTURE EXTENSIONS | Stable contracts first |
| Google Drive/Docs/Sheets knowledge sync | BUILD | OAuth, incremental sync, revocation, delete propagation |
| AI Personality Studio | BUILD | Brief-to-persona compiler, preview, tests, versioning |
| AI trace & human review | BUILD | Explain source/tool outcomes without exposing hidden reasoning |

## Phase 00 — License-safe bootstrap

- [x] Initialize destination public repository.
- [x] Create `feat/ssi-foundation-rebrand` branch.
- [x] Document roadmap, licenses, RAG and brand strategy.
- [ ] Run source import workflow on GitHub Actions, pinned to known upstream SHA.
- [ ] Ensure prohibited enterprise files absent from import commit and git history.
- [ ] Audit existing references into enterprise-only modules; replace with clean Community-compatible equivalents.
- [ ] Capture baseline package-install, typecheck, lint, unit tests and build results.
- [ ] Open draft PR for verified import/foundation.

Exit criteria: pinned source imported, provenance verified, no proprietary source, baseline failures catalogued (not silently ignored).

## Phase 01 — Rebrand and core compatibility

- [ ] Product-wide SSI name, domain config, avatar/logo/favicon (assets supplied or created deliberately).
- [ ] Branding constants and localization; UI labels, e-mail templates, webchat.
- [ ] Replace outbound ChatbotX marketing links with neutral SSI links; retain required license notices.
- [ ] Incrementally migrate internal namespaces through package aliases (avoid blanket replace).
- [ ] Keep existing DB schema / migrations until migration compatibility is proven.
- [ ] Fix Docker/env, auth/session, infrastructure and CI; smoke test login/dashboard/worker/inbox.

Exit criteria: reproducible SSI web build + clean runtime basics; migration safety confirmed.

## Phase 02 — Unified Inbox and channel contracts

- [ ] Inbox account/channel/workspace filters; bot/human categories; timeordered events.
- [ ] Accurate AI vs human sender labels and durable message provenance; real-time sync.
- [ ] Autopilot/Copilot/Human switch with atomic conversation ownership & deduplicated delivery.
- [ ] Audit OAuth, webhook signatures, retries, messaging windows, rate limit and renewals.
- [ ] Channel test fixtures for Facebook Page, Instagram professional, TikTok Business, Threads replies, webchat.
- [ ] No supported API -> no feature claim; no personal Facebook scraping or private login automation.

## Phase 03 — AI Personality Studio

- [ ] Versioned persona schema (name, avatar, optional fictional presentation, role, tone, honorifics, locale, response length, emoji usage, boundaries).
- [ ] AI prompt compiler: user brief -> proposed structured editable prompt -> validation -> manual approval -> versioned publish.
- [ ] Playground with controlled knowledge snapshot and synthetic test customers.
- [ ] Per-account AI assignment, schedule, fallback model, budget, output policies.
- [ ] Multi-turn memory with retention policy and privacy controls.
- [ ] Agent-run traces, tool outcomes and retriever citations available to authorized operators.

## Phase 04 — Smart Knowledge Hub (see RAG_ARCHITECTURE.md)

- [ ] Upload/parse PDF, DOCX, TXT, MD, HTML, CSV, XLSX, JSON and other tested formats.
- [ ] AI-assisted schema inference (columns, entities, products, FAQs) plus user preview/edit before import.
- [ ] Google Drive OAuth, select files/folders; Docs/Sheets native extraction; incremental change polling/events as permitted.
- [ ] SQL records + pgvector embeddings + lexical search + reranking; document version pinning and source citations.
- [ ] Deduplication, content hash, sync status/error, delete propagation; re-embed only changes.
- [ ] Per-tenant retrieval filters, injection isolation, RAG evaluations and refusal on insufficient evidence.
- [ ] Live inventory/pricing/order inquiries routed to authorized API tools.

## Phase 05 — Multi-tenant, security, production

- [ ] Roles and permissions; cross-tenant isolation test suite.
- [ ] Service account token encryption, key rotation and audit history.
- [ ] Worker queues with idempotency keys, retry policies, DLQ and operational dashboards.
- [ ] Cost limits and tenant quotas; latency and failure budgets.
- [ ] Backup restore tests, migration rollback plans and incident runbooks.
- [ ] No exposure of client data in prompts sent to unauthorized models.

## Phase 06 — Growth modules (after P0 reliability)

Analytics, scheduling/publishing, app notifications, mobile iOS/Android, billing/plans, marketplace extensions.

## Definition of done

Every phase must have code, migrations as needed, reproducible commands, security checks, test outputs, reviewable commit/PR and no unverified claims of platform connectivity.
