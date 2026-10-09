# SSI Audit — Phase 02 inbox checkpoint

Audit date: 2026-10-09. Foundation pinned at 2726466929f36855e95e46eb848f0448f1baa63b.

## Confirmed by CI

- Community import workflow run 37918099480: success. Commercial `apps/builder/src/enterprise/**` folder not in imported tree.
- Foundation CI workflow runs 37919233260 and 37919241179: dependency install, builder TypeScript check and Next.js build succeeded.
- Baseline CI did **not** run the full Vitest suite, production database migrations, browser end-to-end tests, platform OAuth or real incoming messages.
- Default platform name, SVG logo and manifest were changed. Many package namespace identifiers and legacy PNG brand assets remain unchanged to protect compatibility. Rebrand is incomplete.

## Important findings

1. Existing inbox uses three resizeable panes, live message store, channel filters and bot/human filters. Do not rewrite it for visual reasons.
2. Message schema persists `senderType`: bot/contact/user/api/system. That is enough to distinguish automation from human or API senders, but NOT proof of generative-AI response vs a deterministic flow.
3. The worker's BotResponseTrackingContext is consumed to attach metrics to first sent message, but there is not yet a verified query joining model/tool/RAG retrieval citations into inbox UI. Do not fabricate activity details.
4. Bot pause in ChatbotX is time-based (default 24h); UI must never claim a permanent Human Only policy without additional persistence.
5. Commercial features removed from UI still require functional replacements when SSI supports multi-tenant team routing or billing.
6. `getTenantSettings` defaults privacy/terms URLs to null after rebrand; SSI needs official legal docs before public signup.
7. Google Sheets integration exists in upstream but is not equivalent to recursive knowledge-source synchronization for Sheets/Docs/Drive.
8. Current file parsing supports multiple document types but chunking is naive fixed-size/overlap. Structured dataset import, source revisions, citation mapping, re-ranking and Drive sync are future work.

## Phase 02 increment A (this branch)

- Provenance badges for outgoing bot/human/API/system messages, omitted for guests.
- Right-pane automation activity displays actual loaded bot replies and correct enabled/paused state; does not falsely present LLM reasoning or retrieval sources.
- Tests cover honest sender classification and outgoing-only behavior.
- Next increments: persist LLM response provenance linked to outbound message; secured trace API; model/tool/source inspection; persistent Autopilot/Copilot/Human modes and approval queue; channel/account filters and regression tests.

## Required before production

Vitest suite, database isolation/migration tests, agent human-handoff concurrency tests, Meta/TikTok/Google OAuth tests, webhook signature tests, rate-limit/retry verification, staging deployment, license/secret review, accessibility review.
