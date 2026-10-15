# SSI Phase 00-06 delivery objectives

Requested by the repository owner on 2026-10-15. Scope is the existing MASTER_PLAN.md, not a reduced replacement roadmap. Canonical implementation branch: feat/ssi-clean-history-rebuild, draft PR #5. Starting revision: f83f0145625999aed1c8aabd5c0c1636ac2468e2.

## Delivery contract

A commit, a passing unit test, a disabled feature flag, and an accepted phase are different things. A phase is accepted only with implemented product paths, required migrations, passing security/negative tests, reproducible evidence at an exact revision, and the external acceptance records applicable to that phase. Never edit a release gate to green merely to close this plan. Keep upstream MIT notices; do not reintroduce excluded commercial source. No production deploy, data migration, force-push, or merge is authorized by this implementation plan.

## Goals and exit checks

| Phase | Product outcome | Required exit evidence |
| --- | --- | --- |
| 00 - License-safe bootstrap | A pinned, attributable Community source base with restricted source excluded and baseline failures accounted for. | Worktree AND reachable-history checks; dependency/license inventory and source review; disposition of issue #4 and old public references; install/typecheck/lint/test/build results. Passing the path-boundary script alone is not license clearance. |
| 01 - Rebrand and core compatibility | Reproducible SSI web/worker startup, branding, auth/session and core routes without destructive schema changes. | Builder/business/worker typechecks; regression suite; deliberate brand assets; Docker startup; login/dashboard/inbox browser tests; forward/backward migration evidence on representative disposable data. |
| 02 - Unified Inbox and channel contracts | Real inbound/outbound chronology with authoritative provenance, Human Only/Copilot/Autopilot, safe human handover and reviewed delivery. | Workspace-scoped ownership races; server-produced versioned AI drafts; immutable approval history; transactional outbox, send-time authorization and idempotency; trace authorization; reconnect/retry/revocation cases; channel-specific credential-backed E2E records. Operator drafts and approved_not_sent do not meet AI generation or delivery acceptance. |
| 03 - AI Personality Studio | Editable brief-to-persona proposals with validation, explicit publish approval, immutable versions and rollback; account assignment and a bounded playground. | Tenant isolation and role tests for read/edit/publish/assign; prompt-policy precedence and injection tests; deterministic version selection in real agent runs; synthetic multi-turn playground; budget/fallback/schedule enforcement; retention and privacy controls. |
| 04 - Smart Knowledge Hub | Reviewable document/table ingestion and authorized Drive/Docs/Sheets sync; versioned hybrid retrieval with real citations and insufficient-evidence fallback. | Tested format matrix; parsing limits; workspace filters in storage/search/cache; document hash/version pinning; update/delete/revocation propagation; incremental jobs and retries; retrieval/citation evaluation data; live-tool inventory/price assertions only from authorized tool results. |
| 05 - Multi-tenant, security, production | Least-privilege credentials, secure tenant boundaries, bounded queues and model costs, observable and recoverable operation. | Cross-tenant denial suite; token encryption/rotation and webhook replay/signature tests; retry/DLQ/idempotency evidence; concurrent quota tests; redacted logs; backup restore and rollback drills; incident runbook; model/egress authorization review. |
| 06 - Growth modules | Analytics, scheduling/publishing, app notifications, mobile iOS/Android, billing/plans and governed marketplace extensions, after P0 reliability. | Analytics privacy/access checks; publisher authorization/window/deduplication cases; notification opt-in/revocation; mobile build/auth/deep-link tests; signed billing webhook replay and entitlement tests; extension provenance/permission/revocation checks. Real store/payment/channel approvals are separate evidence, not mocked connectivity claims. |

## Work order and acceptance ownership

1. Clear the existing broad regression failures without suppressing tests. Preserve the fail-closed Phase 00-02 acceptance audit.
2. Finish one Phase 02 vertical slice: generate -> persist version -> edit/review -> durable approval -> enqueue -> reauthorize -> send -> persist outcome and trace. Include handover, stale version, tenant mismatch, duplicate, timeout and ambiguous provider result cases.
3. Integrate Persona selection (Phase 03) and Knowledge retrieval/citations (Phase 04) into that same slice; do not build disconnected demos and call them complete phases.
4. Apply Phase 05 controls as each path is built; validate recovery on disposable infrastructure, not production accounts.
5. Enable Phase 06 only after its dependency gates are met. Analytics/billing scaffolding is not a completed mobile/publishing/marketplace product.

Engineering owns code, migrations, automated tests, reproducible commands and truthful evidence. Source/legal disposition belongs to the repository owner and a qualified reviewer where needed. Channel, model, payment and store acceptance requires the corresponding authorized account and credentials; never commit credentials or customer message contents as evidence. Those dependencies do not prevent safe implementation work, but do prevent a release-ready claim.

## Evidence format

For each completed objective record: objective ID, code revision, test command, run/artifact URL, expected and observed result, environment class (unit/disposable/live), remaining limitations and reviewer. Re-run affected gates after changes; a successful run on an earlier revision is not a verdict for the current head. Do not report a percentage from file or commit counts.

Initial technical issue: broad builder regression includes an import-time SQL evaluation in ssi-copilot-draft-service.ts. Lazy SQL construction plus a dedicated import-isolation regression test is the first repair. Full CI results, not this statement, determine whether that repair closes the regression objective.
