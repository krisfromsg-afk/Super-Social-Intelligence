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

## 2026-10-14 outgoing bot envelope isolation increment

In addition to re-reading the workspace-scoped conversation mode from the database, the message dispatcher now verifies that an outbound **bot** message's stored `workspaceId` and `conversationId` match the queued conversation before it reaches any provider. This guards against replaying a message under another conversation's ownership check when message storage has no foreign keys. The guard refuses missing/mismatched identifiers; manual human/API sends remain on their existing dispatch contract. Dedicated unit tests assert a valid binding and cross-tenant/cross-conversation denials.

This narrows one payload-swap attack surface; it **does not** make the worker's persisted message and provider send atomic, nor replace the required unique send claims/outbox and live channel E2E.

## 2026-10-14 permission enforcement for mode activation

The SSI mode mutation server action now checks **workspace member permissions, not merely workspace membership**, before calling CAS persistence. Members with Inbox/contacts access (including assigned-only) can stop automated replies via Human Only. Changing to Copilot or Autopilot requires `flows` or `superAdmin` authorization. Platform-support impersonation cannot mutate any of these modes. The pure permission predicate is covered by negative tests and exercised by Ownership Safety CI. The separate existing legacy enable-bot actions and provider paths require their own authorization/audit before complete tenant certification.

## 2026-10-14 malformed-control CAS hardening

`setSsiAiMode` now protects PostgreSQL's version cast with a typed `CASE` predicate. Only absent SSI control (legacy version zero) or a recognized object containing a positive integer version and recognized mode may win the CAS. An explicit invalid `ssiAiControl` value, an array/scalar `additionalAttributes`, or a nonnumeric/oversized version fails the update instead of being misclassified as legacy or triggering a raw PostgreSQL cast exception. In all cases the API fails closed; it never silently enables Autopilot. Existing workspace-scoped match and version increments are preserved.

## 2026-10-14 legacy Inbox bot toggle permission parity

The original `enableBotAction`, `disableBotAction`, and `keepHumanOnlyAction` now call the same workspace-scoped SSI mode permission guard as `setSsiAiModeAction`. This closes the old action path where any authenticated workspace member could re-enable legacy automatic sending without `flows` authorization. Human stopping automation requires Inbox/contacts permissions; support impersonation cannot mutate these actions. Neither this check nor mode CAS replaces the atomic send-claim/outbox requirement.
