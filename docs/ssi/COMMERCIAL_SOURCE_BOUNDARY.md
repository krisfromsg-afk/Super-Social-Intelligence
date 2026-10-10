# SSI Commercial Source Boundary

**Maintained on main | 2026-10-10**

## Why a license cannot simply be deleted

A `LICENSE` file is legal text specifying rights to use and redistribute the corresponding source code. Erasing the file or replacing commercial wording with "MIT" **does not change** the original copyright owner's permission. Conversely, a source-level feature that checks entitlements or license tokens is executable code; deleting those checks does not confer permission to use any separately licensed Enterprise implementation.

## Current main

The baseline `main` contains SSI planning documents and its README, **not the imported ChatbotX application**. Consequently the disputed `packages/database/src/schema/enterprise/LICENSE` and the associated source files are **not present on main** and cannot be deleted there.

The canonical working snapshot is `feat/ssi-clean-history-rebuild` / [PR #5](https://github.com/krisfromsg-afk/Super-Social-Intelligence/pull/5). It is rebuilt with a clean `main` parent, excludes the original `apps/builder/src/enterprise/**`, `packages/database/src/schema/enterprise/**`, and `packages/database/src/relations/enterprise/**` source trees, and includes independently implemented SSI data models and relations in `schema/ssi-platform`. The branch passed targeted Foundation and broad regression GitHub Actions on commit `b0e344267893e4e96204d9d1555c6545c059d34e`, which is **not sufficient on its own** to certify production deployment or legal clearance.

## Rules enforced on main

1. Never commit the three excluded source trees, or any commit history with those paths, to main.
2. Block any nested `LICENSE` or `NOTICE` under application/packages/integrations explicitly declaring *ChatbotX Commercial License* until an authorized review.
3. Preserve the original Community copyright and MIT terms when Community source is merged; preserve third-party license notices. Do not replace or disguise upstream authorship.
4. Keep separately licensed components out of SSI; independently design equivalents rather than copying commercial source or simply disabling license validation.
5. Do not equate passing CI with tenant-security E2E, PostgreSQL migration/backfill, credential validation, or full Phase 02 completion.
6. Stop unreviewed upstream import; compare a new upstream commit with SSI's pinned source first.

## Scope and limitations

The automated boundary intentionally matches **known excluded paths and nested license declarations**. It does not prove that every line in the rest of the snapshot is freely licensed, audit binaries, resolve every third-party license, remove cached pull-request refs, or grant rights over trademarks. A complete provenance/license and deployment review remains open in [issue #4](https://github.com/krisfromsg-afk/Super-Social-Intelligence/issues/4).

Original ChatbotX upstream attribution and MIT notice must not be removed to make the interface look entirely Spider Hubs-owned. The **new, independently authored SSI functionality and branding** may be developed as Spider Hubs' own work, without falsely relicensing upstream code.

## Legacy references

Earlier PR #1/#2 were closed without merging; their historical commits may remain reachable through stale branch or GitHub PR/cached references until those refs are separately cleaned. Retargeting branch heads does not guarantee deletion from GitHub's object database. Review the affected public history and consult GitHub Support for cache/pull-request retention if needed.
