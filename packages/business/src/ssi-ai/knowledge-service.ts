import { and, asc, db, desc, eq, sql, type DatabaseClient } from "@chatbotx.io/database/client"
import { aiEmbeddingModel, aiFileModel, ssiKnowledgeChunkModel, ssiKnowledgeVersionModel } from "@chatbotx.io/database/schema"
import { assertSsiMember } from "./access"
import { assertSsiExpectedVersion, SSI_AI_LIMITS, ssiKnowledgeTerms, ssiSnapshotDigest, ssiTextDigest } from "./policy"

export type SsiKnowledgeHit = { id: string; fileId: string; version: number; name: string; content: string; digest: string }

async function inspectChunks(input: { workspaceId: string; fileId: string }, tx: DatabaseClient = db) {
  const chunks = await tx.select({ id: aiEmbeddingModel.id, content: aiEmbeddingModel.content, status: aiEmbeddingModel.status })
    .from(aiEmbeddingModel).where(and(eq(aiEmbeddingModel.workspaceId, input.workspaceId), eq(aiEmbeddingModel.aiFileId, input.fileId)))
    .orderBy(asc(aiEmbeddingModel.id)).limit(501)
  if (chunks.length < 1 || chunks.length > 500 || chunks.some((chunk) => chunk.status !== "success" || !chunk.content.trim() || chunk.content.length > 16_000) || chunks.reduce((n, c) => n + c.content.length, 0) > 2_000_000) {
    throw new Error("Publish requires 1-500 completed chunks and at most 2 million characters")
  }
  const digest = ssiSnapshotDigest(chunks.map((chunk) => ({ id: chunk.id, digest: ssiTextDigest(chunk.content) })))
  return { chunks, digest }
}

export const ssiKnowledgeService = {
  async inspect(input: { workspaceId: string; fileId: string }) {
    const [file] = await db.select({ name: aiFileModel.name }).from(aiFileModel).where(and(eq(aiFileModel.workspaceId, input.workspaceId), eq(aiFileModel.id, input.fileId))).limit(1)
    if (!file) throw new Error("Knowledge document is unavailable")
    const { chunks, digest } = await inspectChunks(input)
    const [current] = await this.versions(input)
    return { name: file.name, draftDigest: digest, publishedVersion: current?.version ?? 0, publishedDigest: current?.digest ?? null, chunkCount: chunks.length,
      // Bounded preview. The digest covers EVERY chunk, not just the preview.
      preview: chunks.slice(0, 5).map((chunk) => chunk.content.slice(0, 2000)) }
  },
  async versions(input: { workspaceId: string; fileId: string }) {
    return db.select({ version: ssiKnowledgeVersionModel.version, digest: ssiKnowledgeVersionModel.digest, name: ssiKnowledgeVersionModel.name, chunkCount: ssiKnowledgeVersionModel.chunkCount, createdAt: ssiKnowledgeVersionModel.createdAt })
      .from(ssiKnowledgeVersionModel).where(and(eq(ssiKnowledgeVersionModel.workspaceId, input.workspaceId), eq(ssiKnowledgeVersionModel.fileId, input.fileId)))
      .orderBy(desc(ssiKnowledgeVersionModel.version)).limit(100)
  },

  async publish(input: { workspaceId: string; fileId: string; actorId: string; expectedVersion: number; expectedDigest: string }) {
    assertSsiExpectedVersion(input.expectedVersion)
    return db.transaction(async (tx) => {
      await assertSsiMember({ ...input, permission: "manage_ai" }, tx)
      const [file] = await tx.select().from(aiFileModel).where(and(eq(aiFileModel.workspaceId, input.workspaceId), eq(aiFileModel.id, input.fileId))).for("update").limit(1)
      if (!file) throw new Error("Knowledge document is unavailable")
      const [current] = await tx.select().from(ssiKnowledgeVersionModel).where(and(eq(ssiKnowledgeVersionModel.workspaceId, input.workspaceId), eq(ssiKnowledgeVersionModel.fileId, input.fileId)))
        .orderBy(desc(ssiKnowledgeVersionModel.version)).limit(1)
      if ((current?.version ?? 0) !== input.expectedVersion) throw new Error("Knowledge publication changed; refresh")
      const { chunks, digest } = await inspectChunks(input, tx)
      if (digest !== input.expectedDigest) throw new Error("Knowledge content changed; inspect and review again")
      const [version] = await tx.insert(ssiKnowledgeVersionModel).values({
        workspaceId: input.workspaceId, fileId: input.fileId, version: input.expectedVersion + 1,
        publishedBy: input.actorId, name: file.name, digest, chunkCount: chunks.length,
      }).returning()
      await tx.insert(ssiKnowledgeChunkModel).values(chunks.map((chunk, ordinal) => ({
        workspaceId: input.workspaceId, versionId: version.id, ordinal, content: chunk.content, digest: ssiTextDigest(chunk.content),
      })))
      return { version: version.version, digest, chunkCount: chunks.length }
    })
  },

  async assertCurrent(input: { workspaceId: string; sources: Array<{ fileId: string; version: number; chunkId: string; digest: string }> }, tx: DatabaseClient) {
    // Lock source files in stable order so a concurrent delete or publication
    // cannot pass between the check and committing the generated draft.
    for (const source of [...input.sources].sort((a, b) => a.fileId < b.fileId ? -1 : a.fileId > b.fileId ? 1 : 0)) {
      const [file] = await tx.select({ id: aiFileModel.id }).from(aiFileModel).where(and(eq(aiFileModel.workspaceId, input.workspaceId), eq(aiFileModel.id, source.fileId))).for("share").limit(1)
      if (!file) throw new Error("Knowledge source was revoked")
      const [version] = await tx.select({ id: ssiKnowledgeVersionModel.id, version: ssiKnowledgeVersionModel.version }).from(ssiKnowledgeVersionModel)
        .where(and(eq(ssiKnowledgeVersionModel.workspaceId, input.workspaceId), eq(ssiKnowledgeVersionModel.fileId, source.fileId))).orderBy(desc(ssiKnowledgeVersionModel.version)).limit(1)
      if (!version || version.version !== source.version) throw new Error("Knowledge publication changed")
      const [chunk] = await tx.select({ content: ssiKnowledgeChunkModel.content, digest: ssiKnowledgeChunkModel.digest }).from(ssiKnowledgeChunkModel)
        .where(and(eq(ssiKnowledgeChunkModel.workspaceId, input.workspaceId), eq(ssiKnowledgeChunkModel.versionId, version.id), eq(ssiKnowledgeChunkModel.id, source.chunkId))).limit(1)
      if (!chunk || chunk.digest !== source.digest || ssiTextDigest(chunk.content) !== source.digest) throw new Error("Knowledge source integrity changed")
    }
  },

  /** Only current published revisions; deleting the source cascades revocation. */
  async search(input: { workspaceId: string; fileIds: string[]; query: string }): Promise<SsiKnowledgeHit[]> {
    if (input.fileIds.length > 30 || input.query.length > 8000) throw new Error("Knowledge search exceeds bounds")
    const terms = ssiKnowledgeTerms(input.query)
    if (!input.fileIds.length || !terms.length) return []
    // Interpolated JS arrays expand into SQL lists in this Drizzle version;
    // they are not a single PostgreSQL array parameter. Bind each ID explicitly.
    // No raw SQL, concatenated identifiers, or relaxation of tenant filtering.
    const selectedFiles = sql.join(input.fileIds.map((id) => sql`${id}`), sql`, `)
    const query = terms.join(" | ")
    const rows = await db.execute<SsiKnowledgeHit>(sql`
      SELECT c."id"::text AS "id", v."fileId"::text AS "fileId", v."version", v."name", c."content", c."digest"
      FROM ${ssiKnowledgeChunkModel} c
      JOIN ${ssiKnowledgeVersionModel} v ON v."id" = c."versionId" AND v."workspaceId" = c."workspaceId"
      JOIN ${aiFileModel} f ON f."id" = v."fileId" AND f."workspaceId" = v."workspaceId"
      WHERE c."workspaceId" = ${input.workspaceId}
        AND v."fileId"::text IN (${selectedFiles})
        AND v."version" = (SELECT MAX(v2."version") FROM ${ssiKnowledgeVersionModel} v2 WHERE v2."workspaceId" = v."workspaceId" AND v2."fileId" = v."fileId")
        AND to_tsvector('simple', c."content") @@ to_tsquery('simple', ${query})
      ORDER BY ts_rank_cd(to_tsvector('simple', c."content"), to_tsquery('simple', ${query})) DESC, c."id"
      LIMIT ${SSI_AI_LIMITS.maxKnowledgeChunks}
    `)
    let characters = 0
    return rows.rows.filter((row) => {
      if (ssiTextDigest(row.content) !== row.digest) throw new Error("Knowledge snapshot integrity check failed")
      if (characters + row.content.length > SSI_AI_LIMITS.maxKnowledgeCharacters) return false
      characters += row.content.length
      return true
    })
  },
}
