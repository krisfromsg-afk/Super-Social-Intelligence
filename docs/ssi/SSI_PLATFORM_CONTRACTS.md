# SSI independently authored platform data contracts — checkpoint

## Implementation
- Added `packages/database/src/schema/ssi-platform/models.ts` with tenant, domain, help-item, audit, workspace usage and quota structures, designed from **non-commercial SSI service call sites** (not from the disputed nested-license upstream source).
- Added explicit Drizzle relations, changed four user/workspace/account/template tenant imports, and reconnected schema/types and relational queries.
- Full source file audit and CI gates are still required: this is a **code compatibility candidate**, not proof of commercial-license clearance.
- The table names are deliberately retained as DB compatibility identifiers. Current ORM vs Drizzle migration snapshot drift **passed** (#38017870148), but no actual applied migration, rollback, preserved customer data, or connected PostgreSQL environment has been certified. Do not run migrations on customer data until backward-compatibility/rollback are demonstrated.
- Retain MIT and third-party notices and keep `packages/database/src/schema/enterprise/**` removed.

## Verification gates
- [x] `pnpm --filter builder check-types` and `pnpm --filter builder build` (Foundation CI #38017870148)
- [x] business/worker TypeScript and CI-covered Builder/Worker regression (Broad CI #38017870158; not the full repo-wide CI matrix)
- [x] Drizzle schema snapshot drift check (#38017870148 and #38017870158)
- [ ] migration + rollback on seeded PostgreSQL (untested)
- [ ] root tenant seeding and workspace/tenant isolation
- [ ] quota enforcement and bot takeover race tests
- [ ] all nested licensing, provenance and dependency review
- [ ] runtime login, channel and Inbox staging E2E

STOP-SHIP remains until these are satisfied.
