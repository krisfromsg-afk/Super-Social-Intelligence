# ChatbotX Community upstream sync audit — 2026-10-10

**Verdict: NO NEW UPSTREAM COMMIT TO IMPORT.** Deliberate no-op; SSI application files were not overwritten or merged.

## Verified source refs

| Reference | Commit / date |
| --- | --- |
| ChatbotX upstream `main` | `f1ca4a8f74cc08ca68d601ba2ce0e58bd9c5e67c` (2026-10-09 08:32 UTC) |
| SSI Community pinned source in `scripts/ssi/import-community.sh` | `f1ca4a8f74cc08ca68d601ba2ce0e58bd9c5e67c` |
| Compare pinned source to upstream `main` | **identical**, ahead 0 / behind 0 |
| Latest upstream release | `v1.12.0`, published 2026-10-08 20:38 UTC |
| Release tag | `8f76c8e953f98a38c12bb98042cbd772830c171c`; main is **5 commits ahead** of this tag |

Those five post-release changes are already present in the SSI pinned Community source:
1. #1455 public API agent guidance.
2. #1433 Google Ads click-to-message conversion tracking.
3. #1458 Google sign-in redirect fix.
4. #1459 Facebook sign-in unverified-account fix.
5. #1456 Inbox read/unread behavior fix.

Open upstream proposals such as #1453 (connections) and #1457 (coexist contact-sync dating) are **unmerged**, and are not part of the audited source pin. Do not import them as a release.

## v1.12.0 operational upgrade impact (for existing installations)

The Connection/ConnectSession architecture is included in the pinned snapshot. For an actual deployment, the upstream release notes require:
- Apply reviewed database migrations; backfill connections in **dry-run**, then execute approved backfill, then verify the first three report counters are all zero.
- `REALTIME_BROADCAST_SECRET` at least 32 characters.
- Coordinate any split queue Redis settings (`REDIS_QUEUE_URL`/`REDIS_QUEUE_BULK_URL`) with a drain and restart.

**No production migration/backfill has been run for SSI in this audit**; none can be certified without a controlled database and credentials.

## SSI-specific non-importable areas

The clean SSI feature branch intentionally excludes `apps/builder/src/enterprise/**`, `packages/database/src/schema/enterprise/**` and `packages/database/src/relations/enterprise/**`. Keep the mixed-license STOP-SHIP issue #4 open until provenance and history are resolved. Do not reimport the pinned source simply to achieve parity: that would overwrite Spider Hubs feature code. Review individual upstream commits only when the upstream main SHA advances.

## CI integrity note

The earlier CI at `eba51bb0` was red because `drizzle-kit generate` required an interactive rename decision in a non-TTY environment. SSI-authored ORM models were reconciled to the migration snapshot in later commits; Foundation #38017870148 and Broad Regression #38017870158 passed schema-drift and their covered unit/type/build gates. **No actual PostgreSQL migration, historical data preservation or rollback is certified.** The Phase 0–2 strict release gate remains blocked.

Upstream: https://github.com/ChatbotXIO/ChatbotX

Latest release: https://github.com/ChatbotXIO/ChatbotX/releases/tag/v1.12.0

Acceptance tracking: issue #4, issue #3 and draft PR #5.
