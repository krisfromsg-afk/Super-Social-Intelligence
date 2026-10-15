import { afterAll, afterEach, describe, expect, it, vi } from "vitest"
import { db, eq } from "@chatbotx.io/database/client"
import { aiAgentModel, aiEmbeddingModel, aiFileModel, contactModel, conversationModel, ssiAiRunModel, ssiCopilotRevisionModel, userModel, workspaceModel } from "@chatbotx.io/database/schema"
import { ssiCopilotDraftService } from "../../conversation/ssi-copilot-draft-service"
import { ssiPersonaService } from "../persona-service"
import { ssiKnowledgeService } from "../knowledge-service"
import { ssiCopilotGenerationService } from "../generation-service"
import { ssiTextDigest } from "../policy"

const transport = vi.hoisted(() => ({ messages: [{ id: "101", messageType: "incoming", text: "Where is the warehouse?" }] }))
vi.mock("../../message/service", () => ({ messageService: { listLastMessages: async () => transport.messages } }))
// Real database claims, versions and isolation, but never model/channel/Redis.
vi.mock("../../workspace-lifecycle/with-blocked-owner-guard", () => ({ withBlockedOwnerGuard: async (_id: string, fn: () => Promise<unknown>) => fn() }))

const enabled = process.env.SSI_AI_DATABASE_TEST === "true"
if (enabled) {
  const url = new URL(process.env.DATABASE_URL ?? "")
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/ssi_ci") throw new Error("SSI AI tests require the disposable local ssi_ci database")
}
const owners: string[] = []
const workspaces: string[] = []
async function fixture() {
  const [owner] = await db.insert(userModel).values({ email: `ssi-ai-${crypto.randomUUID()}@example.test` }).returning()
  owners.push(owner.id)
  const [workspace] = await db.insert(workspaceModel).values({ name: "SSI isolated fixture", ownerId: owner.id }).returning()
  workspaces.push(workspace.id)
  const [contact] = await db.insert(contactModel).values({ workspaceId: workspace.id }).returning()
  const [conversation] = await db.insert(conversationModel).values({ workspaceId: workspace.id, contactId: contact.id, botEnabled: false, additionalAttributes: { ssiAiControl: { mode: "copilot", version: 1 } } }).returning()
  const [agent] = await db.insert(aiAgentModel).values({ workspaceId: workspace.id, name: "Fixture agent", prompt: "Answer from evidence", temperature: 0.3, maxOutputTokens: 1000, models: [{ provider: "openai", model: "test-model" }], messages: [], tools: [], actionRules: [], actionPrompt: null }).returning()
  return { workspaceId: workspace.id, actorId: owner.id, conversationId: conversation.id, agentId: agent.id, expectedModeVersion: 1, expectedDraftVersion: 0 }
}
async function knowledge(input: Awaited<ReturnType<typeof fixture>>) {
  const [file] = await db.insert(aiFileModel).values({ workspaceId: input.workspaceId, name: "Warehouse handbook", path: "fixture-not-a-real-file", mimeType: "text/plain", size: 100 }).returning()
  await db.insert(aiEmbeddingModel).values([{ workspaceId: input.workspaceId, aiFileId: file.id, content: "The warehouse is in district seven.", status: "success" }, { workspaceId: input.workspaceId, aiFileId: file.id, content: "Warehouse opening hours are 9 to 5.", status: "success" }])
  const ref = { workspaceId: input.workspaceId, fileId: file.id }
  const inspection = await ssiKnowledgeService.inspect(ref)
  await ssiKnowledgeService.publish({ ...ref, actorId: input.actorId, expectedVersion: inspection.publishedVersion, expectedDigest: inspection.draftDigest })
  return file
}

describe.skipIf(!enabled)("SSI AI evidence against disposable PostgreSQL", () => {
  afterEach(async () => {
    for (const id of workspaces.splice(0)) await db.delete(workspaceModel).where(eq(workspaceModel.id, id))
    for (const id of owners.splice(0)) await db.delete(userModel).where(eq(userModel.id, id))
    transport.messages = [{ id: "101", messageType: "incoming", text: "Where is the warehouse?" }]
  })
  afterAll(async () => { await db.$client.end() })
  it("allows exactly one concurrent save for an expected draft version", async () => {
    const input = await fixture()
    const outcomes = await Promise.allSettled([ssiCopilotDraftService.save({ ...input, text: "First" }), ssiCopilotDraftService.save({ ...input, text: "Second" })])
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1)
    expect(outcomes.filter((o) => o.status === "rejected")).toHaveLength(1)
    const history = await ssiCopilotDraftService.history(input)
    expect(history).toHaveLength(1); expect(history[0].version).toBe(1)
  })
  it("keeps projection unchanged if a duplicate audit revision aborts the transaction", async () => {
    const input = await fixture()
    await db.insert(ssiCopilotRevisionModel).values({ workspaceId: input.workspaceId, conversationId: input.conversationId, version: 1, modeVersion: 1, actorId: input.actorId, event: "operator_save", textDigest: ssiTextDigest("fixture"), snapshot: {} })
    await expect(ssiCopilotDraftService.save({ ...input, text: "Must roll back" })).rejects.toThrow()
    expect(await ssiCopilotDraftService.get(input)).toBeNull()
  })
  it("rejects another workspace's conversation and nonmember actors", async () => {
    const a = await fixture(), b = await fixture()
    await expect(ssiCopilotDraftService.save({ ...b, conversationId: a.conversationId, text: "forbidden" })).rejects.toThrow()
    await expect(ssiCopilotDraftService.save({ ...a, actorId: b.actorId, text: "forbidden" })).rejects.toThrow()
    expect(await ssiCopilotDraftService.history(a)).toHaveLength(0)
  })
  it("retains every revision and prevents approval after a mode transition", async () => {
    const input = await fixture()
    await ssiCopilotDraftService.save({ ...input, text: "One" })
    await ssiCopilotDraftService.review({ ...input, expectedDraftVersion: 1, decision: "approve" })
    await ssiCopilotDraftService.save({ ...input, expectedDraftVersion: 2, text: "Two" })
    expect((await ssiCopilotDraftService.history(input)).map((r) => r.event)).toEqual(["operator_save", "approve", "operator_save"])
    await db.update(conversationModel).set({ additionalAttributes: { ...(await db.query.conversationModel.findFirst({ where: { id: input.conversationId } }))!.additionalAttributes, ssiAiControl: { mode: "copilot", version: 3 } } }).where(eq(conversationModel.id, input.conversationId))
    await expect(ssiCopilotDraftService.review({ ...input, expectedDraftVersion: 3, expectedModeVersion: 3, decision: "approve" })).rejects.toThrow()
  })
  it("publishes by reviewed digest, detects competing publish and rolls back as a new version", async () => {
    const input = await fixture()
    const first = await ssiPersonaService.inspect(input)
    const request = { ...input, expectedVersion: first.publishedVersion, expectedDigest: first.draftDigest }
    const races = await Promise.allSettled([ssiPersonaService.publish(request), ssiPersonaService.publish(request)])
    expect(races.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    await db.update(aiAgentModel).set({ prompt: "Edited policy" }).where(eq(aiAgentModel.id, input.agentId))
    const second = await ssiPersonaService.inspect(input)
    await expect(ssiPersonaService.publish({ ...input, expectedVersion: 1, expectedDigest: first.draftDigest })).rejects.toThrow("content changed")
    await ssiPersonaService.publish({ ...input, expectedVersion: 1, expectedDigest: second.draftDigest })
    await ssiPersonaService.publish({ ...input, expectedVersion: 2, expectedDigest: first.draftDigest, rollbackOfVersion: 1 })
    const agent = await db.query.aiAgentModel.findFirst({ where: { id: input.agentId } })
    const resolved = await ssiPersonaService.resolve(agent!)
    expect(resolved.version).toBe(3); expect(resolved.agent.prompt).toBe("Answer from evidence")
    expect(await ssiPersonaService.versions(input)).toHaveLength(3)
  })
  it("retrieves published chunks only in their workspace and revokes deleted source files", async () => {
    const a = await fixture(), b = await fixture(), file = await knowledge(a)
    const hits = await ssiKnowledgeService.search({ workspaceId: a.workspaceId, fileIds: [file.id], query: "warehouse" })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((hit) => hit.digest === ssiTextDigest(hit.content) && hit.version === 1)).toBe(true)
    expect(await ssiKnowledgeService.search({ workspaceId: b.workspaceId, fileIds: [file.id], query: "warehouse" })).toHaveLength(0)
    await db.delete(aiFileModel).where(eq(aiFileModel.id, file.id))
    expect(await ssiKnowledgeService.search({ workspaceId: a.workspaceId, fileIds: [file.id], query: "warehouse" })).toHaveLength(0)
  })
  it("does not publish chunks that changed after review", async () => {
    const input = await fixture(), file = await knowledge(input)
    const before = await ssiKnowledgeService.inspect({ ...input, fileId: file.id })
    await db.update(aiEmbeddingModel).set({ content: "Changed warehouse policy" }).where(eq(aiEmbeddingModel.aiFileId, file.id))
    await expect(ssiKnowledgeService.publish({ ...input, fileId: file.id, expectedVersion: before.publishedVersion, expectedDigest: before.draftDigest })).rejects.toThrow("content changed")
    expect(await ssiKnowledgeService.versions({ ...input, fileId: file.id })).toHaveLength(1)
  })
  it("generates, versions, traces and reviews a draft without provider sends; duplicate requests do not call the model again", async () => {
    const input = await fixture(), file = await knowledge(input)
    await db.update(aiAgentModel).set({ tools: [`file:${file.id}`] }).where(eq(aiAgentModel.id, input.agentId))
    const producer = vi.fn(async () => ({ text: "Warehouse answer [K1]", provider: "fixture", model: "fake-model", inputTokens: 12, outputTokens: 6 }))
    const request = { ...input, requestKey: crypto.randomUUID() }
    const result = await ssiCopilotGenerationService.generate(request, producer)
    expect(result.draft.origin).toBe("ai"); expect(result.trace.sources.length).toBeGreaterThan(0)
    expect(result.trace.outputDigest).toBe(ssiTextDigest(result.draft.text))
    await expect(ssiCopilotDraftService.review({ ...input, expectedDraftVersion: result.draft.version, decision: "approve" })).resolves.toMatchObject({ status: "approved_not_sent" })
    await expect(ssiCopilotGenerationService.generate({ ...request, expectedDraftVersion: 2 }, producer)).rejects.toThrow("already used")
    expect(producer).toHaveBeenCalledOnce()
    const other = await fixture()
    await expect(ssiCopilotGenerationService.trace({ ...other, runId: result.draft.runId! })).rejects.toThrow("unavailable")
  })
  it("discards an in-flight result after Human Only takeover", async () => {
    const input = await fixture()
    const producer = async () => {
      await db.update(conversationModel).set({ additionalAttributes: { ssiAiControl: { mode: "human_only", version: 2 } }, botEnabled: false }).where(eq(conversationModel.id, input.conversationId))
      return { text: "Not authorized to stage", provider: "fixture", model: "fake-model" }
    }
    await expect(ssiCopilotGenerationService.generate({ ...input, requestKey: crypto.randomUUID() }, producer)).rejects.toThrow("discarded")
    expect(await ssiCopilotDraftService.history(input)).toHaveLength(0)
    const [run] = await db.select().from(ssiAiRunModel).where(eq(ssiAiRunModel.workspaceId, input.workspaceId))
    expect(run.status).toBe("discarded")
  })
  it("discards an in-flight result when source access is revoked", async () => {
    const input = await fixture(), file = await knowledge(input)
    await db.update(aiAgentModel).set({ tools: [`file:${file.id}`] }).where(eq(aiAgentModel.id, input.agentId))
    await expect(ssiCopilotGenerationService.generate({ ...input, requestKey: crypto.randomUUID() }, async () => {
      await db.delete(aiFileModel).where(eq(aiFileModel.id, file.id))
      return { text: "Revoked warehouse answer [K1]", provider: "fixture", model: "fake-model" }
    })).rejects.toThrow("discarded")
    expect(await ssiCopilotDraftService.history(input)).toHaveLength(0)
  })
  it("enforces the persisted hourly quota before invoking a model", async () => {
    const input = await fixture()
    await db.insert(ssiAiRunModel).values(Array.from({ length: 20 }, (_, i) => ({ workspaceId: input.workspaceId, conversationId: input.conversationId, actorId: input.actorId, agentId: input.agentId, requestKey: `quota-reservation-${i}`, status: "failed", provider: "fixture", model: "fake-model", inputDigest: "fixture", outputTokenLimit: 100 })))
    const producer = vi.fn(async () => ({ text: "Must not run", provider: "fixture", model: "fake-model" }))
    await expect(ssiCopilotGenerationService.generate({ ...input, requestKey: crypto.randomUUID() }, producer)).rejects.toThrow("budget")
    expect(producer).not.toHaveBeenCalled()
  })
})
