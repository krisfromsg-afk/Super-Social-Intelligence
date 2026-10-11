# SSI Phase 04 — Smart Knowledge Hub / Grounded RAG

**Status: DESIGN READY / NOT IMPLEMENTED AS A FULL SSI PRODUCT.** Existing upstream file/sheet primitives are not equivalent to this phase.

## Operator experience

Drop in PDF/DOCX/TXT/Markdown/CSV/XLSX, upload images with supported extraction, paste website URLs, or connect authorized Google Drive Docs/Sheets. Preview detected tables, entities, products and provenance before confirming ingestion. Index revisions incrementally, report extraction failures and let users disable/delete sources and reindex without restarting an agent.

## Proposed architecture

- `KnowledgeSource`: workspace, type, connector/account, external ID, visibility policy, source revision/checksum, sync cursor, indexing status and explicit owner.
- `KnowledgeDocument`: immutable source snapshot + extracted text/table/spreadsheet rows, original citation URL and data lineage.
- `KnowledgeChunk`: structured headers, table keys, normalized metadata, semantic embeddings, lexical index and version IDs.
- `KnowledgeCollection`: explicit workspace/member/persona/channel grants. Source revocation must invalidate retrieval caches and all derived vectors/rows.
- Ingestion: scoped OAuth/webhook or user upload -> malware/type/size checks -> extract/normalize -> infer structured records with human confirmation -> dedupe/checksum -> queue/chunk/index -> evaluate -> publish atomically.
- Retrieval: tenant/collection permission gate FIRST -> hybrid lexical/vector/search over approved versions -> rerank -> response draft with source cites -> consistency/price-stock validation with live approved tools -> only then Phase 2 authorized draft/outbound policy.

## Nonnegotiable acceptance

1. No cross-tenant embeddings, chunks, metadata, signed URLs, refresh tokens or cached answers. Test multiple tenants and deleted document revocation.
2. Spreadsheet header/schema inference MUST distinguish numeric/text/currency/date and never silently guess inventory, live prices or location.
3. Source citations point to exact accessible document/page/sheet/range/revision; unsupported claims get an uncertainty response rather than fabricated citations.
4. Adversarial docs cannot change system/tool instructions or exfiltrate PII; source code/data files are never executed at ingestion.
5. Sync retries, stale cursor, failed webhook, OAuth expiration, deletes/renames, permission changes, incremental index and rollback have fixture + staging proof.
6. Benchmarked retrieval precision/recall, Vietnamese queries, latency/cost limits, invalidation and provider fallbacks have reproducible eval fixtures.

**Delivery after Phase 03:** input/connectors -> structured extraction & user preview -> data model/versioned indexes -> hybrid retrieval with citation -> scoped agent wiring -> eval/security/performance -> browser/live connector E2E.
