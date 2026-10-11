# SSI Phase 03 — Personality Studio

**Status: DESIGN READY / IMPLEMENTATION NOT ACCEPTED.** Must not present existing upstream agent tools as the finished SSI Personality Studio. Phase 2's ownership/outbox and licensing gates remain required.

## Operator experience

Create an AI persona from a plain-language brief, then edit its role, greeting, language, brand voice, hard refusal rules, escalation criteria, objective and allowed channel behaviors in a simple form. Preview on sample contacts before enabling. Keep an explicit immutable published version so an in-flight conversation cannot silently switch to newer instructions. A user can roll back to any earlier approved version.

## Proposed independent SSI contracts

- `Persona`: `id, workspaceId, slug, name, state(draft|published|archived), createdBy`; unique workspace/slug.
- `PersonaVersion`: `id, personaId, workspaceId, version, structuredPolicy, modelSettings, publishedBy, publishedAt`. Immutable after publication.
- `PersonaAssignment`: workspace + channel/account/inbox scope, optional segment, personaVersionId and explicit effective window.
- `PersonaTestRun`: tenant-scoped synthetic test input, expected routing policy, output evaluation, model version, cost/latency counters; redact sensitive text in trace surfaces.

## Compiler and safety

Natural-language brief -> typed draft JSON with confidence and unanswered requirements -> deterministic validation (no external data/guessed prices/permissions) -> preview-only sandbox -> explicit publish. Authorized tools and RAG collections are referenced by IDs with workspace-level permission checks. Compilation must never elevate privileges, redefine tenant-boundary or bypass Human Only/Copilot.

## Acceptance (release-blocking)

Tenant and channel scope, publish/rollback concurrency, escaped prompt injection, consent/PII redaction, vi/en persona templates, model provider change, citations correctness and tool authorization must pass unit, DB, browser and staging E2E. UI accessibility/mobile and undo behavior must be demonstrated. Changes to shared send mode must go through Phase 2's verified outbox/policy gate.

**Delivery order after Phase 02 gates:** schema & migrations -> compiler schema/tests -> version editor UI -> sandbox preview -> assignment & orchestration -> moderation/trace/security -> staging & acceptance.
