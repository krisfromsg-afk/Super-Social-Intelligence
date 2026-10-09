# Super Social Intelligence (SSI)

**AI-agent-first omnichannel customer intelligence platform** by Spider Hubs.

This repository is being initialized from the [ChatbotX Community Edition](https://github.com/ChatbotXIO/ChatbotX). SSI will provide a shared inbox, brand-specific AI personalities, grounded RAG over business knowledge, customer memory, controlled tool use, and multi-account social integrations.

## Current project status

- **Planning and foundation initialization:** in progress on `feat/ssi-foundation-rebrand`.
- **Full upstream Community source import:** pending the license-filtered import workflow.
- **Production-ready AI Agent, Google Drive sync, and RAG upgrades:** not yet implemented.
- **Live channel integration:** requires independently approved platform credentials and verification.

See `docs/ssi/MASTER_PLAN.md`, `docs/ssi/RAG_ARCHITECTURE.md`, `docs/ssi/UPSTREAM_POLICY.md` and `docs/ssi/PHASE_STATUS.md` on the feature branch.

## Provenance and licensing

Upstream: https://github.com/ChatbotXIO/ChatbotX

The source is **mixed-license**. Most upstream code is MIT, while `apps/builder/src/enterprise/` is proprietary and **must not** be imported into SSI without a separate license. The original MIT copyright notice must be preserved. Upstream changes are not automatically safe to merge without filtering and review.

Do not commit secrets or customer OAuth tokens.
