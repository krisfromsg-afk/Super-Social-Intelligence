# SSI Phase 0–1–2 source-based acceptance — 2026-10-10

**Verdict: NOT DONE / RELEASE BLOCKED.** This report is based on the checked-out application tree at `e0bb30e0a2be70a414bfbb236f15a17c26150004`, the actual `MASTER_PLAN.md`, `PHASE02_COMPLETION_PLAN.md`, GitHub Actions and an exact pinned-upstream favicon comparison. It distinguishes source presence from production acceptance.

## Reproducible audit

- Run `node scripts/ssi/audit-phase-0-2.mjs` from repo root; it prints JSON for each of **18 milestones** and explicitly reports missing source witnesses and prohibited Git ancestry. Successful audit execution does **not** equal all milestones DONE.
- Run `node scripts/ssi/audit-phase-0-2.mjs --strict` to enforce full acceptance: deliberately returns exit 1 while any milestone is partial/blocked; exit 2 on missing/misleading source evidence.
- `.github/workflows/ssi-phase-acceptance.yml` runs both checks and uploads the snapshot JSON; `strict-release-gate` is intentionally red while release is not accepted. It must not be silently disabled to merge.
- Every `verified` line means **a particular code-level item is demonstrated**, not that the entire phase passed.

## Checkpoints and links

- [Foundation CI #38017870148](https://github.com/krisfromsg-afk/Super-Social-Intelligence/actions/runs/38017870148) **success**: allowed source boundary, install, Drizzle schema snapshot drift, six focused Inbox/Human Only checks, builder TypeScript and Next build.
- [Broad regression #38017870158](https://github.com/krisfromsg-afk/Super-Social-Intelligence/actions/runs/38017870158) **success**: builder Vitest, business concurrency + TypeScript, worker Vitest + TypeScript and schema drift.
- [Commercial source ancestry #38017870162](https://github.com/krisfromsg-afk/Super-Social-Intelligence/actions/runs/38017870162) **success**, checks known forbidden paths/history and nested license declarations. It is **not** legal clearance.
- [PR #5](https://github.com/krisfromsg-afk/Super-Social-Intelligence/pull/5) remains draft; application source is **not on main**.
- [Issue #4](https://github.com/krisfromsg-afk/Super-Social-Intelligence/issues/4) unresolved scope of commercially licensed material, older cached PR history and independently authored replacements.
- [Issue #3](https://github.com/krisfromsg-afk/Super-Social-Intelligence/issues/3) open Phase 2 acceptance.

## Phase 0 — License-safe bootstrap

**PARTIAL.** A source snapshot pinned at `f1ca4a8f74cc08ca68d601ba2ce0e58bd9c5e67c` is present in canonical clean ancestry. Excluded `apps/builder/src/enterprise/**`, `packages/database/src/schema/enterprise/**`, `packages/database/src/relations/enterprise/**` are absent, and new SSI models/relations exist. CI checks known prohibited paths. But legal provenance beyond those paths, third-party artifacts, GitHub cached PR objects and clean PostgreSQL migration certification remain unaccepted. Old branch-head refs were reset, not a guaranteed full purge.

## Phase 1 — Rebrand/core

**PARTIAL.** Root package and web manifest say SSI, SVG logo/manifest changed, and targeted TypeScript/Next.js build passes. **Follow-up remediation:** all six legacy ChatbotX favicon files have now been replaced by SSI-designed raster/vector assets, and web manifest / Apple icon / tenant override metadata updated. Brand asset Vitest is required in Foundation CI and now rejects any of the six original pinned-upstream Git blob hashes. Full marketing/email/i18n/product identity and live visual acceptance remain open. Internal `@chatbotx.io/*` package imports remain intentionally unchanged. Full marketing/legal link and locale review is outstanding. The Drizzle schema-drift command passing is **not** a DB migration, rollback or existing-data rehearsal. No staging login/dashboard/worker/inbox evidence or approved Terms/Privacy URLs.

## Phase 2 — Unified Inbox

**PARTIAL.** Verified source includes:
- `apps/builder/src/features/ssi-inbox/message-provenance.ts`: labels outgoing Bot/Human/API/System by persisted sender; explicit warning that Bot does not prove LLM involvement.
- `apps/builder/src/features/ssi-inbox/bot-activity-panel.tsx`: renders only loaded outgoing bot replies, no AI reasoning/tool/retrieval traces.
- `apps/builder/src/features/conversations/actions/keep-human-only.action.ts`: disables indefinitely via `botEnabled=false, botResumeAt=null`; unit tests include `human-only.test.ts` and cross-tab state.
- Imported channel and conversation-routing fixtures exist; they are not a SSI live-provider OAuth/webhook certification.

**NOT IMPLEMENTED/NOT ACCEPTED:** P2.3 true flow-vs-LLM message lineage (stored flow references now visible but execution/AI origin explicitly unverified); P2.4 persistent Human/Copilot/Autopilot modes with final send gate; P2.5 durable draft approval/edit/reject/outbox; P2.6 authorized model/tool/retrieval traces; P2.7 full provider-live contracts; P2.8 end-to-end mobile/a11y/vi; P2.9 DB tenancy, OAuth canary and rollback. A broad CI green result does not certify these.

## Release blockers and order

1. Legal/provenance decision and retained clean ancestry (issue #4), full third-party notice scan. No bypass of vendor license gating for features SSI does not own.
2. Phase 1: favicon/marketing/legal/i18n sweep, reproducible infra/staging login/worker, PostgreSQL migration/backfill, schema isolation, rollback.
3. Phase 2: P2.3–P2.6 data model, backend gate, draft lifecycle, secured traces; P2.7–P2.9 actual channels, tenant security, concurrency and browser E2E.
4. Run strict audit and live acceptance. Only mark Phase 0–1–2 DONE and merge the corresponding code when all required gates pass. Do not interpret green build as readiness.

## Executed source audit

On commit `37b724bc2076c4e1511c94b519ff9c1d13824a3b`, the executable script ran in [GitHub Actions #38026788971](https://github.com/krisfromsg-afk/Super-Social-Intelligence/actions/runs/38026788971). The checkpoint job succeeded, proving source witness integrity, forbidden-path ancestry and deterministic report generation. Its JSON artifact reports **3 verified, 7 partial, 8 blocked, 0 invariant violations**. The separate strict gate intentionally returns a nonzero exit code until all items are accepted. This is an acceptance failure, **not** a failing TypeScript build.

## 2026-10-10 favicon/source identity remediation

Implemented on canonical branch following the first audit checkpoint: replaced six upstream-identical favicon assets with the existing SSI icon design, added SVG/ICO/PNG fallbacks and PWA sizes, kept per-tenant favicon override without forcing the wrong SVG MIME type, and added `apps/builder/__tests__/ssi-brand-assets.test.ts` plus a Foundation CI step. This removes **one concrete Phase 1 defect** without claiming Phase 1 accepted. The old artifact baseline (3/7/8) is historical: rerun the current source audit to confirm `oldIconFilesMatchingChatbotX: []`. Visual/browser/tenant-staging sign-off is still required.

## 2026-10-10 incremental source-evidence checkpoint

- `getSsiOutboundFlowReference` reads only outbound bot messages with a non-empty, persisted `contentAttributes.flowId` and optional version/step fields; it never treats a flow reference as proof of LLM generation or completed execution.
- The automation activity panel labels those loaded messages **Flow reference recorded · AI origin unverified**. It does not expose model/tool prompts or invent retrieval sources.
- New focused tests cover flow attribution, malformed metadata, and non-bot messages. The SSI favicon regression test now rejects restoration of the six original ChatbotX file blob hashes.
- **Unchanged status:** Phase 00–02 is NOT ACCEPTED; P2.3–P2.6 require persisted verified executions, enforced send modes, tenant tests and a draft approval/outbox system.
