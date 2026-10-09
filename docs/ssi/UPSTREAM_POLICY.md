# SSI Upstream / Rebrand / Licensing Policy

## Source and pin

- Upstream: https://github.com/ChatbotXIO/ChatbotX
- Source commit: `f1ca4a8f74cc08ca68d601ba2ce0e58bd9c5e67c`
- Licensing **STOP-SHIP**: the root LICENSE provides MIT terms outside `apps/builder/src/enterprise` subject to third-party restrictions, but the source snapshot also had a conflicting nested `packages/database/src/schema/enterprise/LICENSE` declaring **ChatbotX Commercial License**. Its scope is unresolved. The clean branch removes that entire schema subtree and directly dependent relation files, not just the license text; review remaining vendor/third-party sources before claiming license clearance.
- Destination: https://github.com/krisfromsg-afk/Super-Social-Intelligence
- Historical import branch (blocked): `feat/ssi-foundation-rebrand`.
- New clean-parent review branch (draft, build-blocked): `feat/ssi-clean-history-rebuild`.

## Source import constraints

1. Never import `apps/builder/src/enterprise/**` or the disputed `packages/database/src/schema/enterprise/**` into the clean SSI branch or its reachable commit history. Also exclude `packages/database/src/relations/enterprise/**` until clean replacements exist. Do not fork entire upstream Git history into the destination public repo.
2. Use a single clean source snapshot with provenance and preserve original root LICENSE and third-party notices. Do not strip provenance or copyright.
3. Scan for embedded credentials, secrets, binary executables and source locations with distinct licenses, and review generated artifacts.
4. Audit import dependencies on commercial modules; replace imports with original SSI-compatible implementations or disable the related feature. Do not copy Enterprise implementation from build artifacts.
5. Do not claim baseline build passes until CI commands run and record actual outcomes. On clean-source checkpoint, TypeScript remains red because the legacy model exports were removed.
6. Automatic upstream import is disabled pending explicit license review. Do not use the historical branches as a merge base; rebuild from a clean parent and review tree ancestry, not just the final diff.

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
