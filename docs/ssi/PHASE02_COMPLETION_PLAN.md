# SSI Phase 02 — Completion, Acceptance & Release Plan

Updated: **2026-10-10**. **Source of truth:** [issue #3](https://github.com/krisfromsg-afk/Super-Social-Intelligence/issues/3). **Legal STOP-SHIP:** [issue #4](https://github.com/krisfromsg-afk/Super-Social-Intelligence/issues/4). **Code:** canonical [draft PR #5](https://github.com/krisfromsg-afk/Super-Social-Intelligence/pull/5), NOT old closed PR #1 or PR #2.

**Status: PARTIALLY IMPLEMENTED, NOT ACCEPTED, NOT MERGED.** Foundation and broad source CI pass, but there is not yet a production-safe three-state AI ownership and approval system.

## User-visible outcome

A workspace operator can connect authorized accounts, see actual inbound/outbound conversations and reliably distinguish human, generic automated bot, API and system output. Full release must also prove the real generative-AI source, permit Human Only / Copilot draft approval / Autopilot dispatch under a single server policy, reveal authorized model/tool/retrieval metadata and reject stale/replayed jobs after takeover.

## Workstream acceptance ledger

| ID | Status | Delivered | Required to finish |
| --- | --- | --- | --- |
| P2.0 Community Inbox baseline | PARTIAL | Imported three-pane Inbox, real-time and filters | Desktop/mobile E2E and operational acceptance |
| P2.1 Source badges/activity | SOURCE VERIFIED | Bot/Human/API/System outgoing attribution and recent real loaded bot messages | Do not infer flow vs LLM from senderType=bot |
| P2.2 Human handoff | PARTIAL | Indefinite Human Only + re-enable, temporary pause, cross-tab and CAS tests | Cross-dispatcher atomic send-guard and concurrent queue/live E2E |
| P2.3 Durable LLM/flow provenance | BLOCKED | No accepted per-message lineage | Persist flow/agent/model attribution and source IDs tied to actual delivery |
| P2.4 Three-state server policy | BLOCKED | No SSI-owned Human/Copilot/Autopilot persistence | Server-authoritative versioned mode and send claims in every dispatcher |
| P2.5 Approval queue | BLOCKED | No accepted AI draft lifecycle | Versioned draft edit/approve/reject, expiring claim and idempotent outbox |
| P2.6 Agent/source trace viewer | BLOCKED | Activity panel specifically does not claim traces | Workspace-scoped safe model/tool/retrieval metadata and authorization tests |
| P2.7 Channel contracts | PARTIAL | Community adapters with many unit fixtures | SSI OAuth/scope, webhook/replay, rate-limit, messaging window, live credential matrix |
| P2.8 Inbox polish | PARTIAL | Basic UI and filters | Keyboard/a11y, responsive, state, loading, en/vi review |
| P2.9 Regression/security gate | BLOCKED | Builder/worker/business CI and schema-drift checks pass | Postgres migrations, multi-tenant E2E, real dispatcher races, staging/canary rollback |

## Mandatory invariant tests before changing these statuses

1. Human Only: no automated outbound on any worker/flow/AI path, including a queued job created before takeover or an expired temporary pause racing a manual override.
2. Copilot: AI may **only draft**; explicit authorized human approve/edit/reject is required for any send. Concurrent approvals dispatch once; stale/expired draft cannot send.
3. Autopilot: send only when final mode/version/outbox claim, tenant authorization and channel policy all agree. Duplicate webhooks/retries do not create additional deliveries.
4. Provenance: deterministic flow is never mislabeled as an LLM. Trace API links only to stored real runs/sent messages and redacts secrets/internal chain-of-thought.
5. Real providers: OAuth channel/account scopes, signed webhooks, rate limits, retries and messaging windows are verified in provider-specific fixtures and authorized staging.
6. Mobile/web acceptance, real PostgreSQL migration safety, workspace isolation and rollback are tested with recorded commands/results.
7. Legal clearance for the exact final tree, attribution and public history is documented before any production release.

## Evidence and merge order

- [Executed Phase 0–2 audit](PHASE_0_2_EVIDENCE_AUDIT.md): 18 milestones, **3 verified / 7 partial / 8 blocked**.
- [Foundation CI success](https://github.com/krisfromsg-afk/Super-Social-Intelligence/actions/runs/38017870148), [Broad Regression success](https://github.com/krisfromsg-afk/Super-Social-Intelligence/actions/runs/38017870158); neither is production acceptance.
- [Strict release gate](https://github.com/krisfromsg-afk/Super-Social-Intelligence/actions/runs/38026788971) intentionally fails until all acceptance cases are proven.

**Merge order:** clear P0 license/history issue #4 → complete Phase 1 branding/runtime/database staging checks → implement and test P2.3–P2.9 → finish channel/tenant E2E and production release audit → merge approved code. Legacy PR #1/#2 are CLOSED and MUST NOT be revived or used as contaminated parents.
