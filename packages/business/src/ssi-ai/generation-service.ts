import { and, db, eq, sql } from "@chatbotx.io/database/client"
import { aiAgentModel, ssiAiRunModel } from "@chatbotx.io/database/schema"
import type { AIAgentModel } from "@chatbotx.io/database/types"
import { createId } from "@chatbotx.io/utils"
import { lockSsiCopilotConversation, persistSsiCopilotRevision, type SsiDraftMutation } from "../conversation/ssi-copilot-draft-service"
import type { SsiCopilotDraft } from "../conversation/ssi-copilot-draft-state"
import { messageService } from "../message/service"
import { withBlockedOwnerGuard } from "../workspace-lifecycle/with-blocked-owner-guard"
import { assertSsiMember } from "./access"
import { type SsiKnowledgeHit, ssiKnowledgeService } from "./knowledge-service"
import { ssiPersonaService } from "./persona-service"
import { assertSsiId, assertSsiRequestKey, SSI_AI_LIMITS, ssiSnapshotDigest, ssiTextDigest, validateSsiCitationMarkers } from "./policy"

export type SsiDraftProducer = (input: {
  workspaceId: string; agent: AIAgentModel; runId: string; signal: AbortSignal
  messages: Array<{ role: "user" | "assistant"; content: string }>
  sources: SsiKnowledgeHit[]
}) => Promise<{
  text: string; provider: string; model: string; providerResponseId?: string
  inputTokens?: number; outputTokens?: number
}>

export const ssiCopilotGenerationService = {
  async trace(input: { workspaceId: string; conversationId: string; runId: string }) {
    // Explicit allowlist: never return request bodies, credentials, tool payloads
    // or a model's hidden reasoning. A trace is execution metadata, not CoT.
    const [trace] = await db.select({
      id: ssiAiRunModel.id, agentId: ssiAiRunModel.agentId, status: ssiAiRunModel.status,
      provider: ssiAiRunModel.provider, model: ssiAiRunModel.model, personaVersion: ssiAiRunModel.personaVersion,
      createdAt: ssiAiRunModel.createdAt, finishedAt: ssiAiRunModel.finishedAt,
      inputTokens: ssiAiRunModel.inputTokens, outputTokens: ssiAiRunModel.outputTokens,
      providerResponseId: ssiAiRunModel.providerResponseId, outputDigest: ssiAiRunModel.outputDigest,
      sources: ssiAiRunModel.sources, errorCode: ssiAiRunModel.errorCode,
    }).from(ssiAiRunModel).where(and(eq(ssiAiRunModel.workspaceId, input.workspaceId), eq(ssiAiRunModel.conversationId, input.conversationId), eq(ssiAiRunModel.id, input.runId))).limit(1)
    if (!trace) throw new Error("SSI trace is unavailable")
    return trace
  },

  async generate(input: SsiDraftMutation & { agentId: string; requestKey: string }, produce: SsiDraftProducer) {
    assertSsiRequestKey(input.requestKey)
    assertSsiId(input.agentId)
    assertSsiId(input.conversationId)
    if ((await withBlockedOwnerGuard(input.workspaceId, async () => true)) !== true) throw new Error("Workspace is not available for AI generation")
    await assertSsiMember({ ...input, permission: "contacts" })
    const [agent] = await db.select().from(aiAgentModel).where(and(eq(aiAgentModel.workspaceId, input.workspaceId), eq(aiAgentModel.id, input.agentId))).limit(1)
    if (!agent) throw new Error("AI Agent is unavailable in this workspace")
    const persona = await ssiPersonaService.resolve(agent)
    const runId = createId()
    // Reserve BEFORE any provider/embedding call. A database lock, not a local
    // in-memory counter, makes quotas hold across concurrent builders/workers.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`ssi-ai:${input.workspaceId}`}, 0))`)
      await lockSsiCopilotConversation(input, tx)
      const used = await tx.execute<{ total: number; active: number }>(sql`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE "status" = 'reserved' AND "createdAt" > NOW() - INTERVAL '2 minutes')::int AS active
        FROM ${ssiAiRunModel} WHERE "workspaceId" = ${input.workspaceId} AND "createdAt" > NOW() - INTERVAL '1 hour'
      `)
      const counts = used.rows[0]
      if (!counts || !Number.isSafeInteger(counts.total) || !Number.isSafeInteger(counts.active) || counts.total < 0 || counts.active < 0) throw new Error("SSI budget state is unavailable")
      if (counts.total >= SSI_AI_LIMITS.generationsPerHour || counts.active >= SSI_AI_LIMITS.concurrentGenerations) throw new Error("SSI AI generation budget is exhausted; try later")
      const [duplicate] = await tx.select({ id: ssiAiRunModel.id }).from(ssiAiRunModel).where(and(eq(ssiAiRunModel.workspaceId, input.workspaceId), eq(ssiAiRunModel.conversationId, input.conversationId), eq(ssiAiRunModel.requestKey, input.requestKey))).limit(1)
      if (duplicate) throw new Error("Generation request already used; reload the draft instead of retrying")
      await tx.insert(ssiAiRunModel).values({
        id: runId, workspaceId: input.workspaceId, conversationId: input.conversationId, actorId: input.actorId,
        agentId: input.agentId, requestKey: input.requestKey, status: "reserved", provider: "pending", model: "pending",
        personaVersion: persona.version, inputDigest: persona.digest, outputTokenLimit: SSI_AI_LIMITS.maxOutputTokens, sources: [],
      })
    })
    let generated = false
    try {
      const history = await messageService.listLastMessages({
        workspaceId: input.workspaceId, conversationId: input.conversationId, limit: 12,
        sinceTime: new Date(Date.now() - 30 * 24 * 60 * 60_000),
      })
      const lastIncoming = [...history].reverse().find((message) => message.messageType === "incoming" && message.text?.trim())
      if (!lastIncoming) throw new Error("No recent customer text is available for a Copilot reply")
      const messages = history.filter((message) => message.text?.trim()).map((message) => ({
        role: message.messageType === "incoming" ? "user" as const : "assistant" as const,
        content: message.text!.slice(0, 2000),
      }))
      const fileIds = persona.agent.tools.filter((tool) => tool.startsWith("file:")).map((tool) => tool.slice(5))
      const sources = await ssiKnowledgeService.search({ workspaceId: input.workspaceId, fileIds, query: lastIncoming.text!.slice(0, 8000) })
      const inputDigest = ssiSnapshotDigest({ persona: persona.digest, messages, sources: sources.map((source) => ({ id: source.id, digest: source.digest })) })
      await db.update(ssiAiRunModel).set({ inputDigest }).where(and(eq(ssiAiRunModel.workspaceId, input.workspaceId), eq(ssiAiRunModel.id, runId)))
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), SSI_AI_LIMITS.generationTimeoutMs)
      let output: Awaited<ReturnType<SsiDraftProducer>>
      try {
        output = await produce({ workspaceId: input.workspaceId, agent: persona.agent, runId, messages, sources, signal: controller.signal })
        if (controller.signal.aborted) throw new Error("AI generation timed out")
      } finally { clearTimeout(timeout) }
      generated = true
      const text = output.text.trim()
      if (!text || text.length > 8000 || !validateSsiCitationMarkers(text, sources.length)) throw new Error("AI produced an invalid draft or citation")
      if (!output.provider || output.provider.length > 80 || !output.model || output.model.length > 256) throw new Error("AI provider metadata is invalid")
      const freshHistory = await messageService.listLastMessages({ workspaceId: input.workspaceId, conversationId: input.conversationId, limit: 12, sinceTime: new Date(Date.now() - 30 * 24 * 60 * 60_000) })
      if ([...freshHistory].reverse().find((message) => message.messageType === "incoming")?.id !== lastIncoming.id) throw new Error("A new customer message arrived; generate a fresh reply")
      const draft = await db.transaction(async (tx) => {
        await assertSsiMember({ ...input, permission: "contacts" }, tx)
        const { conversation } = await lockSsiCopilotConversation(input, tx)
        await ssiKnowledgeService.assertCurrent({ workspaceId: input.workspaceId, sources: sources.map((source) => ({ fileId: source.fileId, version: source.version, chunkId: source.id, digest: source.digest })) }, tx)
        const safeTokens = (n: number | undefined) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000 ? n : null
        await tx.update(ssiAiRunModel).set({
          status: "completed", provider: output.provider, model: output.model, outputDigest: ssiTextDigest(text),
          providerResponseId: output.providerResponseId?.slice(0, 256) ?? null,
          inputTokens: safeTokens(output.inputTokens), outputTokens: safeTokens(output.outputTokens),
          finishedAt: new Date(), sources: sources.map((source) => ({ fileId: source.fileId, version: source.version, chunkId: source.id, digest: source.digest })),
        }).where(and(eq(ssiAiRunModel.workspaceId, input.workspaceId), eq(ssiAiRunModel.id, runId), eq(ssiAiRunModel.status, "reserved")))
        const next: SsiCopilotDraft = {
          version: input.expectedDraftVersion + 1, modeVersion: input.expectedModeVersion, text,
          origin: "ai", status: "pending", updatedBy: input.actorId, updatedAt: new Date().toISOString(),
          runId, inputLastMessageId: lastIncoming.id,
        }
        return persistSsiCopilotRevision(input, next, "ai_generation", conversation.additionalAttributes, tx)
      })
      return { draft, trace: await this.trace({ ...input, runId }) }
    } catch {
      // Do not persist provider exception bodies: they can include credentials,
      // prompts or customer text. Reservations remain counted on failure.
      await db.update(ssiAiRunModel).set({ status: generated ? "discarded" : "failed", errorCode: generated ? "draft_no_longer_valid" : "generation_failed", finishedAt: new Date() })
        .where(and(eq(ssiAiRunModel.workspaceId, input.workspaceId), eq(ssiAiRunModel.id, runId), eq(ssiAiRunModel.status, "reserved")))
      throw new Error(`SSI generation ${generated ? "was discarded because its context changed or output was invalid" : "failed"}; no message was sent. Reload before retrying.`)
    }
  },
}
