# SSI Copilot staging checkpoint (NOT a sending approval queue)

## Scope

This checkpoint adds one **persisted operator-origin draft per conversation** using the existing `Conversation.additionalAttributes.ssiCopilotDraft` JSONB field, not a new Drizzle schema/migration. The SQL update is atomic and scoped by workspace and conversation, requires `botEnabled=false`, mode `copilot`, exact SSI AI mode version and exact draft version. Review is permitted only from `pending` and records either `approved_not_sent` or `rejected`.

**No outbound delivery occurs from draft save/review.** Approval is **not** a delivery or enqueue signal. There is no LLM attribution, no send worker, and no claimable outbox. Only explicitly operator-authored suggestions can be stored; AI-origin text must be wired in through an independently verified provenance path. The Inbox client UI is integrated with the dedicated workspace-bound staging actions; this is not a production approval queue.

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

### Re-entering Copilot after a Human Only transition

If a conversation switches out of Copilot and returns, the original staged draft is still **readable only to authorized editors** but marked stale. Review/approval is disabled in the UI, and the database will reject a stale-mode approval. An operator can explicitly save a fresh revision with the new mode version; this fixes a CAS dead-end where hiding the old draft caused an endless version-0 conflict. The old revision is overwritten by this interim single-slot storage, which is why append-only audit history remains a release blocker.

### Explicit no-send safeguard

The Ownership Safety CI includes a source-level no-send tripwire for staging actions: a future change that wires `messageService.createOutgoing`, BullMQ queues or direct channel sends into `approve` must fail and receive a deliberate separate outbox review. The unit test for the business staging service also asserts `approved_not_sent` and optimistic-CAS predicates. This tripwire is a review aid, not proof that every possible provider dispatch path is safe.

### Corrupted pending-record defense

Review uses the same locked SQL UPDATE that checks both CAS versions and the Copilot mode. It now also requires a nonblank 1–8000-character text body and a nonblank operator identity in the persisted JSONB record; it cannot approve an empty/tampered pending stub merely because its version and status fields appear valid. Record-integrity checks remain defense in depth, not a substitute for append-only audit, provider send idempotency or a full migration to a dedicated table.

## 2026-10-15 editor safety and return-type repair

The review service now explicitly returns a terminal `SsiCopilotDraftStatus` rather than widening it to `string`; this repairs the Builder TypeScript failure without a client-side cast or a weaker status model.

The editor requires a successful authorized read before allowing mutations. Failed load/save/review operations lock mutation controls until reload. Unsaved textarea changes disable both approval and rejection, and a successful save replaces the visible text with the canonical server-returned text before review is possible. Conversation, workspace and AI-mode-version changes remount the editor; inconsistent `botEnabled=true` Copilot state hides it.

`apps/builder/__tests__/ssi-copilot-draft-panel.test.tsx` exercises the actual React component with mocked action boundaries: initial read, new draft CAS, dirty-text review prevention, save/approve and reject, action errors/reload, stale-mode revision, in-flight disabled controls, realtime mode changes, conversation/workspace isolation and incompatible modes. The Ownership Safety workflow explicitly runs this suite alongside the existing service, permission, redaction and no-send tests. These are component/unit tests, **not live PostgreSQL or provider E2E**.

Verification commands (results must be checked on the matching commit's GitHub Actions run):

```sh
pnpm --filter builder exec vitest run __tests__/ssi-copilot-draft-panel.test.tsx
pnpm --filter builder check-types
pnpm --filter @chatbotx.io/business exec vitest run src/conversation/__tests__/ssi-copilot-draft-state.test.ts src/conversation/__tests__/ssi-copilot-draft-service.test.ts
node --test scripts/ssi/__tests__/copilot-staging-no-send.test.mjs
```

**Phase 02 remains PARTIAL / NOT ACCEPTED.** This repair does not close issues #3 or #4, enable outbound sending, establish append-only audit, certify production migrations, complete i18n/a11y acceptance or clear licensing. Keep canonical PR #5 draft.
