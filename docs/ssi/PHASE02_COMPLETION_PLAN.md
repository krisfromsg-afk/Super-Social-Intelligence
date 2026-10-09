# SSI Phase 02 — Completion, Acceptance & Release Plan

Updated: 2026-10-09. Source of truth: issue #3; legal STOP-SHIP: issue #4.
Status: **IN PROGRESS — NOT ACCEPTED — NOT MERGED**.
Dependency: Phase 00/01 Foundation, PR #1; ongoing work PR #2.

## Product outcome and definition of done

A nontechnical Spider Hubs workspace can connect authorized channel accounts, see real inbound/outbound messages in one mobile-friendly Inbox, identify the REAL sender and verified AI/model activity, seamlessly switch Human Only / Copilot / Autopilot, review AI drafts, inspect source/tool evidence, and stop automation immediately. Every event is tenant-scoped, deduplicated and auditable; no private user login hacks or unverified channel claims.

All phases below require implemented code, tests, API permission checks, a clear changelog and reviewed CI. Green frontend build alone is NOT acceptance.

## Workstreams and checkpoints

| ID | Priority | Scope | Observable acceptance | Current status |
|---|---|---|---|---|
| P2.0 | P0 | Community Inbox baseline and server/mobile architecture | Existing 3-pane real-time inbox remains usable | Inherited, foundation build passed earlier |
| P2.1 | P0 | Sender attribution and activity | Accurate outbound Bot/Human/API/System tags; only real loaded bot activity shown | Implemented; NOT equivalent to LLM attribution |
| P2.2 | P0 | Manual handoff | Explicit indefinite Human Only, temporary 24h pause, ability to re-enable, cross-tab sync, guarded expired-pause CAS | Code committed; focused tests; full race/E2E not signed off |
| P2.3 | P0 | Provenance model | Durable message-to-agent-run relation, identify deterministic flow vs model response; true delivery status, no inferred AI identity | NOT IMPLEMENTED |
| P2.4 | P0 | Three-state send policy | Persistent per-conversation Human Only / Copilot / Autopilot mode; single server-side enforcement gate in every dispatcher; atomic ownership | NOT IMPLEMENTED |
| P2.5 | P0 | Approval queue | Agent creates versioned drafts; human approve/edit/reject; sent once using idempotent outbox; stale drafts invalidated | NOT IMPLEMENTED |
| P2.6 | P0 | Trace viewer | Authenticated, tenant/collection-scoped model/tool/retrieval metadata for actual delivered message; no raw secrets or hidden chain-of-thought | NOT IMPLEMENTED |
| P2.7 | P0 | Channel contracts | OAuth scope, webhook signature, replay protection, rate-limit, retries, messaging window, account mapping fixtures | NOT FULLY VERIFIED |
| P2.8 | P1 | Inbox polish | Channel/account/workspace filters; keyboard/a11y, responsive layout, i18n en/vi, loading/errors, empty states | PARTIAL |
| P2.9 | P0 | Regression and security gate | Build/types/lint, builder/business/worker tests, database isolation, concurrency and E2E; canary rollback; licensing clearance | BLOCKED |

## Architecture contracts for new work

1. **Store durable provenance without fabricated reasoning:** `AgentRun` / message mapping should persist `workspaceId`, `conversationId`, `messageId`, run type (flow/model/tool), status, model identifier, tool names, authorized source IDs, latency/cost and timestamps. Only expose scoped, redacted metadata; do not persist or expose hidden chain-of-thought.
2. **Mode transition is server authority:** `HumanOnly` means no automated outbound; `Copilot` may create suggestions but NEVER silently dispatches; `Autopilot` can auto-send only after policy approval, channel restrictions and a final atomic ownership check.
3. **Concurrency:** state changes and outbound send claims must be conditional on the latest persisted mode/version, with unique message/outbox idempotency keys. Prevent an existing queued worker from sending after human takeover; the current expired-pause CAS is only one part of this guarantee.
4. **Draft lifecycle:** `pending → approved → sending → sent` or `rejected | expired | failed`; approval is idempotent, tied to actor and version. Re-approval may not duplicate dispatch.
5. **Multi-tenant:** every query/write joins or filters `workspaceId`, actor authorization, source collection permission and channel identity. Never trust client-provided source/run IDs alone.
6. **Channels:** adapters remain official API implementations and enforce per-channel permissions and messaging windows at send time; no fake confirmed connectivity.
7. **Migration safety:** additive Drizzle schema/migration with rollback, schema drift checks and review; no production migration without authorized deployment gate.
8. **No proprietary imports:** pin Community upstream, review nested LICENSE scope and re-create required features with original implementation, retaining attribution. Do not silently drop license notices.

## Required acceptance tests

- Operator pauses 24h in tab A; tab B displays correct pause deadline, automatic resume only at proper time, operator can re-enable explicitly.
- Operator selects indefinite Human Only while a stale resume worker is pending; worker CAS cannot overwrite newer choice.
- A model/flow generates content while Human Only or Copilot owns a conversation: **zero** direct automated sends, no duplicate retry deliveries.
- In Copilot: approve/send once, edit before approval, reject, expired/stale version conflict and multi-agent duplicate clicks all give correct durable status.
- Bot/flow/AI labels are proven by persisted lineage; no assistant trace is invented for a deterministic flow message.
- Tool and retrieval traces are visible only to authorized workspace operators and only for allowed sources; no cross-tenant data leakage, tokens or secrets.
- Incoming/replayed webhooks and rate-limit/retry conditions preserve ordering, deduplication and messaging window enforcement.
- E2E on desktop and mobile: unread/message ordering, filters, search, panel scroll, keyboard controls, no stuck recovery after toggling modes.
- CI proves builder + business + worker tests, typechecks/build, vulnerability/secret/license audits; live API tests recorded per account/provider separately.

## Current CI/Audit interpretation

Previous Foundation CI passed at code checkpoints, and prior broad regression uncovered eight stale test failures. The eight contract expectations were revised. A later broad regression still found a server import in `message-thread-pane-scroll.test.tsx`; fixture isolation was fixed. The latest diagnostic runs are not a release verdict until complete. License guards deliberately block acceptance while issue #4 remains unresolved.

**Mandatory merge sequence:** resolve license/provenance/history issue #4 and produce a clean reviewed import → audit and merge PR #1 into main → rebase/retarget PR #2 → complete P2.3–P2.9 and all acceptance gates → merge PR #2 → staging canary → production decision. No code-only success overrides legal, data-security or channel gates.
