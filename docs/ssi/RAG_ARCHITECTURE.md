# SSI Smart Knowledge Hub — Architecture & Implementation Contract

STATUS: architecture approved for implementation; no new RAG engine is claimed deployed.

## Product promise

A nontechnical workspace operator uploads business documents or connects Google Docs/Sheets/Drive. SSI shows what it recognized, suggests structure, allows edits/approval, indexes searchable evidence and structured records, and attaches the right knowledge to the chosen AI Agent. Updates from source flow through incremental jobs; deletion/revocation cleans up indexed material.

## Supported ingestion classes

1. Narrative docs: PDF (with page citations), DOCX, TXT, MD, HTML and Google Docs. Preserve document headings, paragraphs, tables and source offsets.
2. Tabular data: CSV, XLSX, Google Sheets. Infer headers, typed columns and row identity; preserve spreadsheet ID, tab, row range and source revision. User approves field mapping and primary keys.
3. Structured data: JSON/JSONL, FAQs, inventory exports, product catalogs. Validate schema & nested structures with clear error reports.
4. Website: HTTP(S) URL(s) the user is permitted to read; allowlist, robots/crawl policy, size/time limits, SSRF prevention. No private page scraping.
5. Media: images/audio/video only when associated extractors/OCR/transcription are explicitly configured and tested; until then show **unsupported / requires extractor**, never claim arbitrary binary formats work.

## Pipeline and durable entities

Connector -> Discovery -> Fetch -> Type validation -> Parse/extract -> Sanitization -> Chunk/row partition -> AI-assisted classify/schema proposal -> Operator approval (when structured import) -> Dedup/content hash -> Structured store and/or embeddings -> Hybrid index -> Retrieval evaluation -> Publish knowledge revision.

Proposed canonical entities:
`KnowledgeCollection`, `KnowledgeSource`, `SourceCredentialRef`, `SourceRevision`, `IngestionJob`, `Document`, `DocumentSection`, `DocumentChunk`, `StructuredDataset`, `StructuredRow`, `EmbeddingRecord`, `SyncCursor`, `RetrievalTrace`, `EvaluationCase`, `AgentCollectionAccess`.

Every persisted row must contain `workspaceId`; retrieval must scope by tenant AND authorized knowledge collections. Never trust incoming source IDs alone for authorization.

## Storage strategy

Start on existing PostgreSQL + pgvector + full text search: store normalized chunks with language, content hash, source revision, page/sheet/row IDs; optional tables for structured entities. Keep binaries in private S3-compatible storage. Add optional Qdrant adapter only after retrieval benchmarks justify complexity. Use re-ranking as a modular interface; model provider configurable. Do not mirror dynamic stock or prices as sole source of truth: tools query live authorized system.

## Query path

1. Resolve tenant, agent identity, channel and source access policy.
2. Intent classification: FAQ/narrative vs structured row lookup vs live tool.
3. Hybrid retrieval: full-text + semantic vector, filtered by workspace, collection, validity date, locale and source revision.
4. Re-rank and merge adjacent relevant chunks; fit token budget.
5. Compile grounded model context with source citations; treat all fetched source text as **untrusted data** (prompt injection defense).
6. Agent responds with tone from Persona Studio. When confidence/support is insufficient: ask follow-up or hand to human. Never fabricate source pages.
7. Persist trace: source IDs, chunk IDs, scores, model, tokens, latency, tool calls, send status. Do not store hidden chain-of-thought.

## Google Drive / Docs / Sheets sync

- OAuth least-privilege scopes; encrypted refresh tokens; allowlist authorized app origins.
- Select exact Drive files/folders; per-file type, owner, permission and revision metadata.
- Docs: export via approved Google API, preserve headings, lists and tables.
- Sheets: spreadsheet/tab selection; batch rows; keep sheet range, header row, row identity and original cell types; incremental diff by revisions/hash.
- Drive: initial inventory + change token/polling for permitted sources; use service/API with exponential backoff and resumable jobs.
- Handle removed access: mark inaccessible, disable retrieval, and dispose stale chunks/tokens per retention policy.
- Conflict policy: source systems are read-only; user-edited semantic mappings stay versioned, not silently overwritten.

## AI assisted database materialization

Example XLSX columns `sku, name, size, price, stock`: parser suggests Product dataset, primary key `sku`, currency and type mapping. Operator confirms; create typed rows with provenance and validation. Structured queries return exact typed rows; narrative attributes are also searchable through vector index. Distinguish `last_synced_price` from live current price.

## Security and operating constraints

Document size/type limits; zip-bomb/malware defenses; file conversion sandboxes; SSRF filtering; injection tests; PII detection; retention/deletion; encrypted tokens; rate-limited sync; idempotent jobs; dead-letter queue, event trail, source drift alerts.

## Evaluation & acceptance

- Dataset of representative Vietnamese and English questions including ambiguities and missing answers.
- Metrics: retrieval precision@k, grounded answer rate, citation correctness, irrelevant-answer abstention, structured lookup accuracy, median/p95 latency and ingestion recovery.
- Cross-tenant red-team query must not return other tenant's records.
- Drive/Docs/Sheets edits, permission revoke and deletions must reflect in retrieval after synchronization.
- Versioned migrations, unit, integration and replay tests required before deploy.
