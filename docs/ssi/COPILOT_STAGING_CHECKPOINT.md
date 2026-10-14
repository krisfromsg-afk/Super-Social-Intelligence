# SSI Copilot staging checkpoint (NOT a sending approval queue)

## Scope

This checkpoint adds one **persisted operator-origin draft per conversation** using the existing `Conversation.additionalAttributes.ssiCopilotDraft` JSONB field, not a new Drizzle schema/migration. The SQL update is atomic and scoped by workspace and conversation, requires `botEnabled=false`, mode `copilot`, exact SSI AI mode version and exact draft version. Review is permitted only from `pending` and records either `approved_not_sent` or `rejected`.

**No outbound delivery occurs from draft save/review.** Approval is **not** a delivery or enqueue signal. There is no LLM attribution, no send worker, and no claimable outbox. Only explicitly operator-authored suggestions can be stored; AI-origin text must be wired in through an independently verified provenance path. The client UI remains to be integrated.

## Why staging instead of pretending the outbox is done?

The metadata model is a temporary single-record stage and overwrites previous versions; it is **not** append-only, not a full review audit, not a multi-draft queue and not appropriate for regulated or customer-critical approval operations. The next phase must add a proper table with append-only revisions, approver identity and tenant policy, unique delivery idempotency keys, transactional outbox claims, provider idempotency and recovery after a takeover race, then live E2E. No production release or Copilot auto-send may use this interim approval record.

## Invariants

- Workspace-scoped server actions additionally verify contacts-management rights; support impersonation is forbidden.
- Human Only and Autopilot cannot create or approve Copilot drafts, regardless of stale UI state.
- Switching away and back increments AI mode version, invalidating the earlier draft even if the displayed mode is once again Copilot.
- Both concurrent edit attempts against the same draft version cannot win.
- Explicit malformed draft JSON is never treated as an empty draft; it fails closed.
- Approve/reject is a terminal staging decision; it cannot call existing `createMessageAction` or a provider.

## API confidentiality boundary

The `ssiCopilotDraft` staging field is private: public/workspace-token and private Inbox conversation list/single endpoints explicitly redact it before returning a conversation. The shared Zod `conversationResource` additionally strips it at the response-validation boundary. Dedicated draft actions require full `contacts` permission or super-admin rights, excluding support impersonation and assigned-only agents until assigned-scope authorization exists. Dedicated regression tests cover the redaction. This limits the known conversation serialization paths; broader API/telemetry and database access still require release security review.
