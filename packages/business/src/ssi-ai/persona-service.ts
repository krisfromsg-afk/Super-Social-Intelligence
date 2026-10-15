import { and, db, desc, eq, type DatabaseClient } from "@chatbotx.io/database/client"
import { aiAgentActionRulesSchema, aiAgentProviderModels } from "@chatbotx.io/database/partials"
import { aiAgentModel, ssiPersonaVersionModel } from "@chatbotx.io/database/schema"
import type { AIAgentModel } from "@chatbotx.io/database/types"
import { assertSsiMember } from "./access"
import { assertSsiExpectedVersion, ssiSnapshotDigest } from "./policy"

const personaFields = ["name", "prompt", "messages", "models", "temperature", "maxOutputTokens", "tools", "isRichResponse", "webSearchAuthorizedDomains", "actionPrompt", "actionRules"] as const

type PersonaSnapshot = Pick<AIAgentModel, typeof personaFields[number]>

export function readSsiPersonaSnapshot(value: Record<string, unknown>): PersonaSnapshot {
  const snapshot = Object.fromEntries(personaFields.map((field) => [field, value[field]]))
  if (typeof snapshot.name !== "string" || !snapshot.name.trim() || snapshot.name.length > 255 ||
      typeof snapshot.prompt !== "string" || !snapshot.prompt.trim() || snapshot.prompt.length > 10_000 ||
      typeof snapshot.temperature !== "number" || !Number.isFinite(snapshot.temperature) || snapshot.temperature < 0 || snapshot.temperature > 2 ||
      !Number.isSafeInteger(snapshot.maxOutputTokens) || Number(snapshot.maxOutputTokens) < 1 || Number(snapshot.maxOutputTokens) > 32_000 ||
      typeof snapshot.isRichResponse !== "boolean") throw new Error("Invalid SSI persona configuration")
  const models = aiAgentProviderModels.parse(snapshot.models)
  snapshot.models = models
  if (models.length < 1 || models.length > 8) throw new Error("SSI persona requires 1-8 model choices")
  for (const key of ["tools", "webSearchAuthorizedDomains"] as const) {
    if (!Array.isArray(snapshot[key]) || snapshot[key].length > 100 || snapshot[key].some((v) => typeof v !== "string" || v.length > 500)) throw new Error("Invalid SSI persona tools or domains")
  }
  if (!Array.isArray(snapshot.messages) || snapshot.messages.length > 40 || snapshot.messages.some((message) =>
    !message || typeof message !== "object" || !["user", "assistant"].includes(message.role) || typeof message.content !== "string" || message.content.length > 2000
  )) throw new Error("Persona examples may only contain bounded user/assistant messages")
  if (snapshot.actionPrompt !== null && (typeof snapshot.actionPrompt !== "string" || snapshot.actionPrompt.length > 10_000)) throw new Error("Invalid action prompt")
  snapshot.actionRules = aiAgentActionRulesSchema.parse(snapshot.actionRules)
  // Canonicalization also rejects undefined/NaN/inherited objects before persistence.
  ssiSnapshotDigest(snapshot)
  return snapshot as PersonaSnapshot
}

async function latest(workspaceId: string, agentId: string, tx: DatabaseClient = db) {
  const [row] = await tx.select().from(ssiPersonaVersionModel).where(and(
    eq(ssiPersonaVersionModel.workspaceId, workspaceId), eq(ssiPersonaVersionModel.agentId, agentId),
  )).orderBy(desc(ssiPersonaVersionModel.version)).limit(1)
  return row
}

export const ssiPersonaService = {
  async options(input: { workspaceId: string }) {
    return db.select({ id: aiAgentModel.id, name: aiAgentModel.name, isDefault: aiAgentModel.isDefault })
      .from(aiAgentModel).where(eq(aiAgentModel.workspaceId, input.workspaceId)).orderBy(desc(aiAgentModel.isDefault), aiAgentModel.name).limit(200)
  },
  async inspect(input: { workspaceId: string; agentId: string }) {
    const [agent] = await db.select().from(aiAgentModel).where(and(eq(aiAgentModel.workspaceId, input.workspaceId), eq(aiAgentModel.id, input.agentId))).limit(1)
    if (!agent) throw new Error("AI Agent is unavailable")
    const snapshot = readSsiPersonaSnapshot(agent)
    const current = await latest(input.workspaceId, input.agentId)
    return { draftDigest: ssiSnapshotDigest(snapshot), publishedVersion: current?.version ?? 0, publishedDigest: current?.digest ?? null, draft: snapshot }
  },

  async versions(input: { workspaceId: string; agentId: string }) {
    return db.select({ version: ssiPersonaVersionModel.version, digest: ssiPersonaVersionModel.digest, publishedBy: ssiPersonaVersionModel.publishedBy, createdAt: ssiPersonaVersionModel.createdAt, rollbackOfVersion: ssiPersonaVersionModel.rollbackOfVersion })
      .from(ssiPersonaVersionModel).where(and(eq(ssiPersonaVersionModel.workspaceId, input.workspaceId), eq(ssiPersonaVersionModel.agentId, input.agentId)))
      .orderBy(desc(ssiPersonaVersionModel.version)).limit(100)
  },

  /** Publish a reviewed digest, not whatever a competing tab last saved. */
  async publish(input: { workspaceId: string; agentId: string; actorId: string; expectedVersion: number; expectedDigest: string; rollbackOfVersion?: number }) {
    assertSsiExpectedVersion(input.expectedVersion)
    if (!/^[a-f0-9]{64}$/.test(input.expectedDigest)) throw new Error("Invalid reviewed persona digest")
    if (input.rollbackOfVersion !== undefined && (!Number.isSafeInteger(input.rollbackOfVersion) || input.rollbackOfVersion < 1 || input.rollbackOfVersion > input.expectedVersion)) throw new Error("Invalid rollback version")
    return db.transaction(async (tx) => {
      await assertSsiMember({ ...input, permission: "manage_ai" }, tx)
      const [agent] = await tx.select().from(aiAgentModel).where(and(eq(aiAgentModel.workspaceId, input.workspaceId), eq(aiAgentModel.id, input.agentId))).for("update").limit(1)
      if (!agent) throw new Error("AI Agent is unavailable")
      const current = await latest(input.workspaceId, input.agentId, tx)
      if ((current?.version ?? 0) !== input.expectedVersion) throw new Error("Persona changed; refresh before publishing")
      let snapshot = readSsiPersonaSnapshot(agent)
      if (input.rollbackOfVersion !== undefined) {
        const [old] = await tx.select().from(ssiPersonaVersionModel).where(and(
          eq(ssiPersonaVersionModel.workspaceId, input.workspaceId), eq(ssiPersonaVersionModel.agentId, input.agentId), eq(ssiPersonaVersionModel.version, input.rollbackOfVersion),
        )).limit(1)
        if (!old) throw new Error("Persona rollback version is unavailable")
        snapshot = readSsiPersonaSnapshot(old.snapshot)
      }
      const digest = ssiSnapshotDigest(snapshot)
      if (digest !== input.expectedDigest) throw new Error("Persona content changed; review again")
      const [version] = await tx.insert(ssiPersonaVersionModel).values({
        workspaceId: input.workspaceId, agentId: input.agentId, publishedBy: input.actorId,
        version: input.expectedVersion + 1, digest, snapshot, rollbackOfVersion: input.rollbackOfVersion ?? null,
      }).returning({ version: ssiPersonaVersionModel.version, digest: ssiPersonaVersionModel.digest })
      return version
    })
  },

  /** Only Copilot opts into SSI publication in this release. Legacy agent
   * runners remain unchanged until their tool/assignment tests are accepted. */
  async resolve(agent: AIAgentModel): Promise<{ agent: AIAgentModel; version: number | null; digest: string }> {
    const current = await latest(agent.workspaceId, agent.id)
    const snapshot = readSsiPersonaSnapshot(current?.snapshot ?? agent)
    const digest = ssiSnapshotDigest(snapshot)
    if (current && digest !== current.digest) throw new Error("Published SSI persona failed integrity validation")
    return { agent: { ...agent, ...snapshot }, version: current?.version ?? null, digest }
  },
}
