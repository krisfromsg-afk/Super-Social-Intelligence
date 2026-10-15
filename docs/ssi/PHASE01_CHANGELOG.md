# Phase 01 First Rebrand Changes

- Product fallback name and metadata: **Super Social Intelligence**.
- SSI SVG wordmarks/icons replace primary legacy brand assets. Existing legacy PNG favicon files are not yet regenerated and must be removed/replaced before final sign-off.
- Community persistent-menu branding text now names Super Social Intelligence, with link pointing to the deployed instance.
- Default Privacy/Terms URLs are null until SSI publishes actual policies; do not refer to ChatbotX legal URLs as though they are ours.
- Root package name changed to `super-social-intelligence`; internal `@chatbotx.io/*` namespace intentionally unchanged pending dependency-compatible migration.
- CI checks license boundary, installs dependencies, typechecks and builds. The build result must be reviewed; no claim of passing yet.
