import { and, db, eq, sql } from "@chatbotx.io/database/client"
import { conversationModel } from "@chatbotx.io/database/schema"
import { readSsiCopilotDraft, validateSsiCopilotDraftInput } from "./ssi-copilot-draft-state"

/**
 * Transactional single-row staging only. No message insert, enqueue or send.
 * All writes are workspace-scoped and require the current Copilot mode VERSION,
 * so a switch Copilot -> Human Only -> Copilot invalidates old draft reviews.
 */
const attr = conversationModel.additionalAttributes
const current = sql`COALESCE(${attr}, '{}'::jsonb)`
const currentDraft = sql`${attr}->'ssiCopilotDraft'`

function copilotModeGuard(expectedModeVersion: number) {
  return sql`(
    ${conversationModel.botEnabled} = false
    AND ${attr}->'ssiAiControl'->>'mode' = 'copilot'
    AND ${attr}->'ssiAiControl'->>'version' = ${String(expectedModeVersion)}
  )`
}

function draftVersionGuard(expectedDraftVersion: number) {
  // A malformed explicit draft must not be mistaken for an absent one.
  return sql`(CASE
    WHEN ${attr} IS NULL THEN 0
    WHEN jsonb_typeof(${attr}) = 'object' AND NOT (${attr} ? 'ssiCopilotDraft') THEN 0
    WHEN jsonb_typeof(${currentDraft}) = 'object'
      AND jsonb_typeof(${currentDraft}->'version') = 'number'
      AND (${currentDraft}->>'version') ~ '^[1-9][0-9]{0,9}$'
    THEN (${currentDraft}->>'version')::bigint
    ELSE -1
  END) = ${expectedDraftVersion}`
}

export const ssiCopilotDraftService = {
  async get(props: { workspaceId: string; conversationId: string }) {
    const row = await db.query.conversationModel.findFirst({
      where: { workspaceId: props.workspaceId, id: props.conversationId },
      columns: { additionalAttributes: true, botEnabled: true },
    })
    if (!row) throw new Error("Conversation is unavailable")
    const draft = readSsiCopilotDraft(row.additionalAttributes)
    // Staged approval cannot leak across a mode transition.
    const control = row.additionalAttributes && typeof row.additionalAttributes === "object" && !Array.isArray(row.additionalAttributes)
      ? (row.additionalAttributes as Record<string, unknown>).ssiAiControl
      : null
    const c = control && typeof control === "object" && !Array.isArray(control)
      ? control as Record<string, unknown> : null
    if (row.botEnabled || c?.mode !== "copilot" || typeof c?.version !== "number") return null
    if (draft === "invalid") throw new Error("Corrupt Copilot draft; operator repair required")
    return draft && draft.modeVersion === c.version ? draft : null
  },

  async save(props: {
    workspaceId: string
    conversationId: string
    actorId: string
    expectedModeVersion: number
    expectedDraftVersion: number
    text: string
  }) {
    validateSsiCopilotDraftInput(props)
    const draft = {
      version: props.expectedDraftVersion + 1,
      modeVersion: props.expectedModeVersion,
      text: props.text.trim(),
      origin: "operator" as const,
      status: "pending" as const,
      updatedBy: props.actorId,
      updatedAt: new Date().toISOString(),
    }
    // Explicitly operator-authored: never pass user text as verified AI output.
    const [updated] = await db.update(conversationModel)
      .set({ additionalAttributes: sql`jsonb_set(${current}, '{ssiCopilotDraft}', ${JSON.stringify(draft)}::jsonb, true)` })
      .where(and(
        eq(conversationModel.id, props.conversationId),
        eq(conversationModel.workspaceId, props.workspaceId),
        copilotModeGuard(props.expectedModeVersion),
        draftVersionGuard(props.expectedDraftVersion),
      ))
      .returning({ id: conversationModel.id })
    if (!updated) throw new Error("Copilot draft or AI mode changed; refresh and retry")
    return draft
  },

  async review(props: {
    workspaceId: string
    conversationId: string
    actorId: string
    expectedModeVersion: number
    expectedDraftVersion: number
    decision: "approve" | "reject"
  }) {
    validateSsiCopilotDraftInput(props)
    if (props.decision !== "approve" && props.decision !== "reject") {
      throw new Error("Invalid Copilot review decision")
    }
    const status = props.decision === "approve" ? "approved_not_sent" : "rejected"
    const revised = {
      version: props.expectedDraftVersion + 1,
      status,
      reviewedBy: props.actorId,
      reviewedAt: new Date().toISOString(),
    }
    const [updated] = await db.update(conversationModel)
      .set({
        additionalAttributes: sql`jsonb_set(
          ${current}, '{ssiCopilotDraft}',
          (${currentDraft} || ${JSON.stringify(revised)}::jsonb), true
        )`,
      })
      .where(and(
        eq(conversationModel.id, props.conversationId),
        eq(conversationModel.workspaceId, props.workspaceId),
        copilotModeGuard(props.expectedModeVersion),
        draftVersionGuard(props.expectedDraftVersion),
        sql`${currentDraft}->>'status' = 'pending'`,
        sql`${currentDraft}->>'modeVersion' = ${String(props.expectedModeVersion)}`,
        sql`${currentDraft}->>'origin' = 'operator'`,
      ))
      .returning({ id: conversationModel.id })
    if (!updated) throw new Error("Copilot review lost the race or mode changed; refresh and retry")
    // This is NOT dispatch authorization. No API/worker consumes this status.
    return { version: revised.version, status }
  },
}
