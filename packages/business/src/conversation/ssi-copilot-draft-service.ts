import { and, db, desc, eq, type DatabaseClient } from "@chatbotx.io/database/client"
import { conversationModel, ssiAiRunModel, ssiCopilotRevisionModel } from "@chatbotx.io/database/schema"
import { assertSsiMember } from "../ssi-ai/access"
import { ssiKnowledgeService } from "../ssi-ai/knowledge-service"
import { ssiTextDigest } from "../ssi-ai/policy"
import { readSsiAiControl } from "./ssi-ai-control"
import { readSsiCopilotDraft, type SsiCopilotDraft, validateSsiCopilotDraftInput } from "./ssi-copilot-draft-state"

export type SsiDraftMutation = {
  workspaceId: string; conversationId: string; actorId: string
  expectedModeVersion: number; expectedDraftVersion: number
}

/** The row lock is also taken by mode changes, including legacy bot toggles. */
export async function lockSsiCopilotConversation(input: SsiDraftMutation, tx: DatabaseClient) {
  validateSsiCopilotDraftInput(input)
  const [conversation] = await tx.select().from(conversationModel).where(and(
    eq(conversationModel.workspaceId, input.workspaceId), eq(conversationModel.id, input.conversationId),
  )).for("update").limit(1)
  const control = readSsiAiControl(conversation?.additionalAttributes)
  const draft = readSsiCopilotDraft(conversation?.additionalAttributes)
  if (!conversation || conversation.botEnabled || !control || control === "invalid" || control.mode !== "copilot" || control.version !== input.expectedModeVersion || draft === "invalid" || (draft?.version ?? 0) !== input.expectedDraftVersion) {
    throw new Error("Copilot draft or AI mode changed; refresh and retry")
  }
  return { conversation, draft }
}

export async function persistSsiCopilotRevision(input: SsiDraftMutation, draft: SsiCopilotDraft,
  event: "operator_save" | "ai_generation" | "approve" | "reject", attributes: Record<string, unknown> | null,
  tx: DatabaseClient) {
  await tx.insert(ssiCopilotRevisionModel).values({
    workspaceId: input.workspaceId, conversationId: input.conversationId, version: draft.version,
    modeVersion: draft.modeVersion, actorId: input.actorId, event,
    textDigest: ssiTextDigest(draft.text), snapshot: { ...draft },
  })
  await tx.update(conversationModel).set({ additionalAttributes: { ...attributes, ssiCopilotDraft: draft } })
    .where(and(eq(conversationModel.workspaceId, input.workspaceId), eq(conversationModel.id, input.conversationId)))
  return draft
}

export const ssiCopilotDraftService = {
  async get(input: { workspaceId: string; conversationId: string }) {
    const row = await db.query.conversationModel.findFirst({
      where: { workspaceId: input.workspaceId, id: input.conversationId },
      columns: { additionalAttributes: true, botEnabled: true },
    })
    if (!row) throw new Error("Conversation is unavailable")
    const control = readSsiAiControl(row.additionalAttributes)
    if (row.botEnabled || !control || control === "invalid" || control.mode !== "copilot") return null
    const draft = readSsiCopilotDraft(row.additionalAttributes)
    if (draft === "invalid") throw new Error("Corrupt Copilot draft; operator repair required")
    return draft
  },

  async history(input: { workspaceId: string; conversationId: string }) {
    const rows = await db.select({ version: ssiCopilotRevisionModel.version, modeVersion: ssiCopilotRevisionModel.modeVersion,
      event: ssiCopilotRevisionModel.event, actorId: ssiCopilotRevisionModel.actorId, createdAt: ssiCopilotRevisionModel.createdAt,
      textDigest: ssiCopilotRevisionModel.textDigest, snapshot: ssiCopilotRevisionModel.snapshot })
      .from(ssiCopilotRevisionModel).where(and(eq(ssiCopilotRevisionModel.workspaceId, input.workspaceId), eq(ssiCopilotRevisionModel.conversationId, input.conversationId)))
      .orderBy(desc(ssiCopilotRevisionModel.version)).limit(50)
    return rows.map(({ snapshot, ...metadata }) => ({ ...metadata, draft: readSsiCopilotDraft({ ssiCopilotDraft: snapshot }) }))
  },

  async save(input: SsiDraftMutation & { text: string }) {
    validateSsiCopilotDraftInput(input)
    return db.transaction(async (tx) => {
      await assertSsiMember({ ...input, permission: "contacts" }, tx)
      const { conversation, draft: previous } = await lockSsiCopilotConversation(input, tx)
      const derivedFromRunId = previous?.runId ?? previous?.derivedFromRunId
      const draft: SsiCopilotDraft = {
        version: input.expectedDraftVersion + 1, modeVersion: input.expectedModeVersion,
        text: input.text.trim(), origin: "operator", status: "pending",
        updatedBy: input.actorId, updatedAt: new Date().toISOString(),
        ...(derivedFromRunId ? { derivedFromRunId } : {}),
        ...(previous?.inputLastMessageId ? { inputLastMessageId: previous.inputLastMessageId } : {}),
      }
      return persistSsiCopilotRevision(input, draft, "operator_save", conversation.additionalAttributes, tx)
    })
  },

  async review(input: SsiDraftMutation & { decision: "approve" | "reject" }) {
    validateSsiCopilotDraftInput(input)
    if (input.decision !== "approve" && input.decision !== "reject") throw new Error("Invalid Copilot review decision")
    return db.transaction(async (tx) => {
      await assertSsiMember({ ...input, permission: "contacts" }, tx)
      const { conversation, draft } = await lockSsiCopilotConversation(input, tx)
      if (!draft || draft.status !== "pending" || draft.modeVersion !== input.expectedModeVersion) throw new Error("Copilot review lost the race or mode changed; refresh and retry")
      if (draft.origin === "ai" || draft.derivedFromRunId) {
        const [run] = await tx.select({ outputDigest: ssiAiRunModel.outputDigest, status: ssiAiRunModel.status, sources: ssiAiRunModel.sources }).from(ssiAiRunModel).where(and(
          eq(ssiAiRunModel.workspaceId, input.workspaceId), eq(ssiAiRunModel.conversationId, input.conversationId), eq(ssiAiRunModel.id, (draft.runId ?? draft.derivedFromRunId)!),
        )).limit(1)
        if (run?.status !== "completed" || (draft.origin === "ai" && run.outputDigest !== ssiTextDigest(draft.text))) throw new Error("AI draft provenance cannot be verified")
        if (!Array.isArray(run.sources)) throw new Error("AI source references are invalid")
        await ssiKnowledgeService.assertCurrent({ workspaceId: input.workspaceId, sources: run.sources }, tx)
      }
      const revised: SsiCopilotDraft = {
        ...draft, version: draft.version + 1,
        status: input.decision === "approve" ? "approved_not_sent" : "rejected",
        reviewedBy: input.actorId, reviewedAt: new Date().toISOString(),
      }
      await persistSsiCopilotRevision(input, revised, input.decision, conversation.additionalAttributes, tx)
      // Delivery requires its own explicit request; never change the semantics
      // of the existing "Approve (no send)" button into a provider side effect.
      return { version: revised.version, status: revised.status as "approved_not_sent" | "rejected" }
    })
  },
}
