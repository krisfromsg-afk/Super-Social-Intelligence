# SSI AI ownership — incremental safety boundary (2026-10-11)

**Implementation status: PARTIAL. DO NOT MERGE / DEPLOY AS ACCEPTED PHASE 02.**
Canonical clean-source code: `feat/ssi-clean-history-rebuild` / PR #5.

## Delivered in this checkpoint

1. `packages/business/src/conversation/ssi-ai-control.ts` parses explicit SSI control and fail-closes malformed control. Existing legacy conversations without a mode retain their normal bot-enabled behavior. A disabled bot remains disabled even if the queued job carries an expired pause timestamp.
2. `conversationService.setSsiAiMode({ workspaceId, id, expectedVersion, mode, userId })` persists the versioned `ssiAiControl` JSON inside the existing `Conversation.additionalAttributes` column. A single workspace-scoped SQL UPDATE compares the expected version and synchronizes `botEnabled` / `botResumeAt` with it. A stale tab cannot commit another state on top of a newer version.
3. Inbox `MessageThreadPane` can select Human Only, Copilot, or Autopilot using a workspace-authorized server action. Copilot is deliberately **send-disabled**, not an approval system.
4. The two shared provider dispatch functions `sendMessageToChannel` and `sendFlowStepToChannel` re-read current `Conversation` state from DB for the correct workspace **before** calling channel APIs. A missing row, stale Human Only state, Copilot or malformed control blocks automated dispatch; direct human/API sends are not silently converted to bot sends.
5. Focused Vitest suites test default state, malformed JSON, disabled send, tenant-scoped fetch, worker error, CAS and UI parser. GitHub Actions is the actual execution evidence, not source presence alone.

## Safety invariant and intentional limitations

The guard is **pre-dispatch**, not a transaction spanning a remote provider send. A Human Only operation racing after the last DB read but before the provider accepts an in-flight request can still win locally too late. BullMQ duplicate jobs and Meta webhook echoes still require durable idempotent outbox claims and delivery state. Until they exist the mode is not fully race-certified.

Copilot NEVER treats metadata such as `approved: true` from a queued job as authorization. A future approval flow must persist the draft, actor identity, policy version and workspace/channel scope, then claim exactly once in a transaction, verify policy at the final send boundary and record provider delivery IDs.

Storing mode in an existing JSONB column avoids a new table migration for this small control, **not** the requirement for real PostgreSQL upgrade, rollback and existing-data compatibility testing. Multi-tab UI refresh and nonstandard provider dispatch paths also require acceptance.

## Next implementation gates

- Durable, tenant-scoped draft/approval/reject queue with versioned policy references.
- Atomic send claim/outbox using stable idempotency key + DB transaction/replay suppression; final gate for EVERY route (flows, templates, scheduled sends, broadcasts, channel-specific sends).
- Persisted verified LLM/flow execution provenance and redacted trace API linked to message/provider delivery ID.
- Postgres data + rollback rehearsal, rate/window/signature fixtures, concurrent takeover/E2E and browser/mobile/vi/a11y acceptance.
- Exact-tree source/license/third-party review and public-history cleanup (#4) before main merge.

See [Phase 2 acceptance plan](PHASE02_COMPLETION_PLAN.md), [Phase 3 plan](PHASE03_PERSONALITY_STUDIO_PLAN.md), and [Phase 4 plan](PHASE04_KNOWLEDGE_HUB_PLAN.md).
