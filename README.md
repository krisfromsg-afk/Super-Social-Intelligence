# Super Social Intelligence (SSI)

**AI-agent-first omnichannel customer intelligence platform** by Spider Hubs.

This repository is being initialized from the [ChatbotX Community Edition](https://github.com/ChatbotXIO/ChatbotX). SSI will provide a shared inbox, brand-specific AI personalities, grounded RAG over business knowledge, customer memory, controlled tool use, and multi-account social integrations.

## Current project status

- **Planning and foundation initialization:** source snapshot and baseline builder build were committed on `feat/ssi-foundation-rebrand`; do not treat the branch as approved for merge.
- **Licensing stop-ship:** additional nested `packages/database/src/schema/enterprise/LICENSE` claims the ChatbotX Commercial License; the original import filter was incomplete. **Issue #4** requires provenance, dependency and Git-history remediation before merging or publishing a binary.
- **Inbox Phase 02:** partial increments on `feat/ssi-inbox-ai-visibility-phase02` include sender badges, activity, durable Human Only, re-enable UI and bot state sync. Copilot approval, AI trace and cross-platform acceptance are not complete.
- **Production-ready AI Agent, Google Drive sync, and RAG upgrades:** not yet implemented/accepted.
- **Live channel integration:** requires independently approved platform credentials and verification.

See `docs/ssi/MASTER_PLAN.md`, `docs/ssi/RAG_ARCHITECTURE.md`, `docs/ssi/UPSTREAM_POLICY.md` and `docs/ssi/PHASE_STATUS.md` on the feature branch.

## Provenance and licensing

Upstream: https://github.com/ChatbotXIO/ChatbotX

The source is **mixed-license**. Most upstream code is MIT, while `apps/builder/src/enterprise/` is proprietary and **must not** be imported into SSI without a separate license. The original MIT copyright notice must be preserved. Upstream changes are not automatically safe to merge without filtering and review.

Do not commit secrets or customer OAuth tokens.
