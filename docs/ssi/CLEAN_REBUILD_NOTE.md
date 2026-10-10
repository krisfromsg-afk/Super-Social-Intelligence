# SSI clean-source rebuild checkpoint — 2026-10-09

**STOP-SHIP. This is NOT a working, licensed production release.**

## Why this branch exists

The previously imported Community feature branches include a nested `ChatbotX Commercial License` inside `packages/database/src/schema/enterprise`. Removing the license text alone is not a lawful remediation. SSI must exclude the full suspect source scope, rebuild compatible functionality independently after an upstream/legal scope review, and validate with tests.

This branch is a fresh commit with parent `main` at `9a9233dbeb9efbbb80c0fb3f4444bf612c16234b`, **not** a descendant of the contaminated import commit. It snapshots the SSI feature work while deleting all 8 files under the suspect schema directory and the 6 directly coupled relation files. The barrel exports are removed. The import script/CI are hardened to reject the corresponding paths. This avoids carrying suspect source in the new branch's reachable commit history.

**Deliberate consequences:** existing business/worker dependencies may still reference removed schema types. Do NOT make build green by copying the restricted definitions back, changing only names, or removing the license file. Build failures must be solved with independently implemented schema and service replacements plus regression/migration tests.

## Outstanding work before replacing earlier PRs

1. Identify whether any additional commercial license applies outside `packages/database/src/schema/enterprise`; review root and nested LICENSE/NOTICE, dependencies, artifacts and upstream documentation. Seek upstream/legal confirmation where ambiguous.
2. Inventory every import and database migration referencing `Tenant`, `UserQuota`, `AuditLog`, `CustomDomain`, `TenantHelpItem`, `WorkspaceUsage`, and the removed relation exports.
3. Specify SSI-owned tenancy/limits/audit requirements independently, implement compatible models/migrations, remove old vendor license-gate dependencies as appropriate. Do not copy/rename the original commercial code.
4. Re-run builder/business/worker typechecks, unit suites, database migration tests, security/license scan, E2E; correct the failing CI. This branch must remain draft and unmerged until those gates pass.
5. After new clean history is validated, close/replace old PR #1 and #2; address the previously public contaminated branches/PR refs/caches with appropriate GitHub Support and legal guidance. Creating this new branch **does not delete** old objects from GitHub.

## Attribution

SSI is a Spider Hubs product. Retain the underlying source MIT notices, upstream authorship, and third-party licenses. The SSI additions can carry separate copyright; no rebrand rewrites copyright history.
