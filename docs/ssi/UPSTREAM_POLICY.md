# SSI Upstream / Rebrand / Licensing Policy

## Source and pin

- Upstream: https://github.com/ChatbotXIO/ChatbotX
- Source commit: `f1ca4a8f74cc08ca68d601ba2ce0e58bd9c5e67c`
- License: root LICENSE says MIT for code outside `apps/builder/src/enterprise` and third-party exceptions; that enterprise directory uses a commercial license.
- Destination: https://github.com/krisfromsg-afk/Super-Social-Intelligence
- Branch: `feat/ssi-foundation-rebrand`.

## Source import constraints

1. Never import `apps/builder/src/enterprise/**` into any SSI branch **or commit history**. Do not fork entire upstream Git history into destination public repo.
2. Use a single clean source snapshot with provenance and preserve original root LICENSE and third-party notices. Do not strip provenance or copyright.
3. Scan for embedded credentials, secrets, binary executables and source locations with distinct licenses, and review generated artifacts.
4. Audit import dependencies on commercial modules; replace imports with original SSI-compatible implementations or disable the related feature. Do not copy Enterprise implementation from build artifacts.
5. Do not claim baseline build passes until CI commands run and record actual outcomes.

## Rebrand strategy

Product identifier: Super Social Intelligence; short name: SSI; organization: Spider Hubs.
Treat brand strings and package symbols separately. UI labels/docs/branding can be changed early. Renaming `@chatbotx.io/*` package scopes, DB relations, queues, webhook identifiers and migrations must be staged behind compatibility aliases and tests. Brand customization per tenant will be new SSI code, not pulled from `enterprise/platform-branding`.

## Upstream update

- Workflow imports an allowed upstream snapshot onto review branch, **never** auto-merges to SSI main.
- Record new upstream SHA, source version, changes and license diff.
- Apply reviewed bugfixes through patch/cherry-pick/transformation only after scanning forbidden paths.
- Sync compatibility tests include TypeScript imports, migrations, webhook channels and agent answer behavior.
- SSI custom modules live in separate packages/feature folders; minimize source edits that need conflict resolution.

## Current limitations

This repository is a public bootstrap. The import automation will require GitHub Actions to be enabled with `contents: write` permission. Permission or enterprise imports must not be bypassed. Third-party API permissions/quotas are outside the source license.

## STOP-SHIP licensing finding — 2026-10-09

A nested `packages/database/src/schema/enterprise/LICENSE` was discovered after initial source import. It states the ChatbotX Commercial License. The earlier MIT-only assumption and exclusion rule for `apps/builder/src/enterprise/**` are insufficient. Issue #4 blocks merge and production. This does **not** decide the legal scope of all neighboring files; require a full file-by-file provenance and licensing review. A new clean-tree history is required if any restricted blob was copied into the public feature branch. Do not silently delete just the notice while retaining restricted code, and do not use an unreviewed dependency shim to hide the problem.
