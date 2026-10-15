# SSI Feature Matrix (source audit vs planned)

`KEEP`: realtime inbox, conversations, contact CRM, messaging channel adapters, worker queues, model integrations, MIT Community agent runner, file embeddings and vector search.
`REWORK`: beginner onboarding; omnichannel inbox UX; bot/human ownership and AI output trace; tenant-scoped authorization; secure RAG ingestion workflow.
`BUILD`: AI Personality Studio, AI brief compiler, persona versions, Agent Playground, structured data materialization, Google Drive/Docs ingestion, incremental sync, hybrid RAG reranking, retrieval evaluations.
`DEFER`: native publishing/calendar, marketing minigames, reseller billing, native mobile, broad workflow marketplace.
`NEVER IMPORT`: `apps/builder/src/enterprise/**`, including audit-logs, billing, team-inbox, platform-branding, platform-email-templates and enterprise management code.

All current source capabilities still require source integration and actual tests before claiming SSI deployment.
