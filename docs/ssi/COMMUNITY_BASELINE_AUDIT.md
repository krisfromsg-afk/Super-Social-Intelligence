# SSI Community Source Baseline — First build findings

CI run 37918511766 (2026-10-09): dependency install **passed**, builder TypeScript check **failed** because open-core source contains imports into `apps/builder/src/enterprise/**`, which is intentionally excluded from public SSI.

Clean-room remediation in this patch:
- Disable proprietary branding/email-template/audit-log and reseller/portal routes (no Enterprise source imported).
- Keep Team Inbox DTO as a minimal read-only SSI Community schema; disable non-existent teams API and team selection until independently implemented.
- Replace commercial billing dialog/button dependencies with explicit unavailable controls; no fake checkout.
- Remove tests tied *only* to unavailable proprietary modules, retaining non-enterprise public query tests.
- Keep AI Agent, RAG, CRM, and channel code unchanged.

Follow-up: rerun TypeScript check; audit further missing references and runtime role checks; implement SSI teams/billing as separate original modules if needed.

Not production ready. No claims about customer-facing live integration until channel smoke tests pass.
