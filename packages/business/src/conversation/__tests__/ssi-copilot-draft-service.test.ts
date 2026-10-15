import { beforeEach, describe, expect, it, vi } from "vitest"
import { ssiTextDigest } from "../../ssi-ai/policy"

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[][], findFirst: vi.fn(), insert: vi.fn(), set: vi.fn(), where: vi.fn(), lock: vi.fn(), transaction: vi.fn(),
}))
vi.mock("@chatbotx.io/database/client", () => {
  const client = {
    query: { conversationModel: { findFirst: mocks.findFirst } },
    select: () => {
      const query = { from: () => query, where: (p: unknown) => { mocks.where(p); return query },
        orderBy: () => query, for: (mode: string) => { mocks.lock(mode); return query }, limit: async () => mocks.rows.shift() ?? [] }
      return query
    },
    insert: () => ({ values: mocks.insert }),
    update: () => ({ set: (v: unknown) => { mocks.set(v); return { where: async (p: unknown) => { mocks.where(p) } } } }),
    transaction: async <T>(body: (tx: unknown) => Promise<T>) => { mocks.transaction(); return body(client) },
  }
  return { db: client, and: (...clauses: unknown[]) => ({ and: clauses }), eq: (column: string, value: unknown) => ({ eq: [column, value] }), desc: (column: string) => ({ desc: column }), asc: vi.fn(), sql: vi.fn() }
})
vi.mock("@chatbotx.io/database/schema", () => ({
  conversationModel: { id: "id", workspaceId: "workspaceId", additionalAttributes: "additionalAttributes" },
  workspaceModel: { id: "id", ownerId: "ownerId" },
  workspaceMemberModel: { workspaceId: "workspaceId", userId: "userId", permissions: "permissions" },
  ssiAiRunModel: { id: "id", workspaceId: "workspaceId", conversationId: "conversationId", outputDigest: "outputDigest", status: "status", sources: "sources" },
  ssiCopilotRevisionModel: { version: "version", modeVersion: "modeVersion", event: "event", actorId: "actorId", createdAt: "createdAt", textDigest: "textDigest", snapshot: "snapshot", workspaceId: "workspaceId", conversationId: "conversationId" },
  aiEmbeddingModel: {}, aiFileModel: {}, ssiKnowledgeChunkModel: {}, ssiKnowledgeVersionModel: {},
}))
const { ssiCopilotDraftService } = await import("../ssi-copilot-draft-service")
const shared = { workspaceId: "123", conversationId: "456", actorId: "789", expectedModeVersion: 4, expectedDraftVersion: 0 }
const pending = { version: 1, modeVersion: 4, origin: "operator", text: "Draft", status: "pending", updatedBy: "789", updatedAt: "2026-10-14T00:00:00.000Z" }
const conversation = (draft?: Record<string, unknown>, mode = "copilot", version = 4) => ({ id: "456", workspaceId: "123", botEnabled: false,
  additionalAttributes: { keep: "untouched", ssiAiControl: { mode, version }, ...(draft ? { ssiCopilotDraft: draft } : {}) } })
function authorize(row = conversation()) { mocks.rows.push([{ ownerId: "789" }], [row]) }
beforeEach(() => { mocks.rows = []; for (const mock of [mocks.findFirst, mocks.insert, mocks.set, mocks.where, mocks.lock, mocks.transaction]) mock.mockReset(); mocks.insert.mockResolvedValue(undefined) })

describe("SSI transactional Copilot review (no delivery side effects)", () => {
  it("locks a tenant-scoped conversation and records the revision before updating projection", async () => {
    authorize()
    const draft = await ssiCopilotDraftService.save({ ...shared, text: "Hello there" })
    expect(draft).toMatchObject({ origin: "operator", status: "pending", modeVersion: 4, version: 1, text: "Hello there" })
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.lock).toHaveBeenCalledWith("update")
    expect(mocks.where.mock.calls.map((call) => JSON.stringify(call))).toContainEqual(expect.stringContaining('"workspaceId","123"'))
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "123", conversationId: "456", event: "operator_save", version: 1, textDigest: ssiTextDigest("Hello there") }))
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ additionalAttributes: expect.objectContaining({ keep: "untouched" }) }))
  })
  it("records explicit approval, reviewer and content hash without sending", async () => {
    authorize(conversation(pending))
    const result = await ssiCopilotDraftService.review({ ...shared, expectedDraftVersion: 1, decision: "approve" })
    expect(result).toEqual({ version: 2, status: "approved_not_sent" })
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ event: "approve", snapshot: expect.objectContaining({ reviewedBy: "789", status: "approved_not_sent" }) }))
  })
  it("rejects stale versions, mode changes and corrupt drafts before an audit or update", async () => {
    for (const row of [conversation(pending), conversation(undefined, "human_only"), conversation(undefined, "copilot", 5), conversation({ ...pending, text: "" })]) {
      authorize(row)
      await expect(ssiCopilotDraftService.save({ ...shared, text: "new" })).rejects.toThrow("refresh and retry")
    }
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled()
  })
  it("rejects an unauthorized or cross-workspace actor", async () => {
    mocks.rows.push([{ ownerId: "987" }], [])
    await expect(ssiCopilotDraftService.save({ ...shared, text: "new" })).rejects.toThrow("authorized workspace member")
    expect(mocks.lock).not.toHaveBeenCalledWith("update"); expect(mocks.insert).not.toHaveBeenCalled()
  })
  it("does not update projection when durable audit persistence fails", async () => {
    authorize(); mocks.insert.mockRejectedValueOnce(new Error("audit unavailable"))
    await expect(ssiCopilotDraftService.save({ ...shared, text: "new" })).rejects.toThrow("audit unavailable")
    expect(mocks.set).not.toHaveBeenCalled()
  })
  it("verifies AI run ownership and exact output digest at review", async () => {
    const ai = { ...pending, origin: "ai", runId: "555" }
    authorize(conversation(ai)); mocks.rows.push([{ status: "completed", outputDigest: ssiTextDigest(ai.text), sources: [] }])
    await expect(ssiCopilotDraftService.review({ ...shared, expectedDraftVersion: 1, decision: "approve" })).resolves.toEqual({ version: 2, status: "approved_not_sent" })
    expect(JSON.stringify(mocks.where.mock.calls)).toContain('"conversationId","456"')
    mocks.insert.mockClear(); mocks.set.mockClear()
    authorize(conversation(ai)); mocks.rows.push([{ status: "completed", outputDigest: ssiTextDigest("different") }])
    await expect(ssiCopilotDraftService.review({ ...shared, expectedDraftVersion: 1, decision: "approve" })).rejects.toThrow("provenance")
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled()
  })
  it("allows an authorized operator to reject a draft whose AI evidence is unavailable, but never approve it", async () => {
    const ai = { ...pending, origin: "ai", runId: "555" }
    authorize(conversation(ai))
    await expect(ssiCopilotDraftService.review({ ...shared, expectedDraftVersion: 1, decision: "approve" })).rejects.toThrow("provenance")
    expect(mocks.insert).not.toHaveBeenCalled()
    authorize(conversation(ai))
    await expect(ssiCopilotDraftService.review({ ...shared, expectedDraftVersion: 1, decision: "reject" })).resolves.toEqual({ version: 2, status: "rejected" })
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ event: "reject", snapshot: expect.objectContaining({ reviewedBy: "789", runId: "555" }) }))
  })
  it("attributes an edited AI draft to its human editor, preserving lineage but not approval", async () => {
    authorize(conversation({ ...pending, origin: "ai", runId: "555" }))
    const result = await ssiCopilotDraftService.save({ ...shared, expectedDraftVersion: 1, text: "Edited" })
    expect(result).toMatchObject({ origin: "operator", derivedFromRunId: "555", version: 2, status: "pending" })
    expect(result.runId).toBeUndefined(); expect(result.reviewedBy).toBeUndefined()
  })
  it("rejects bad input before a transaction", async () => {
    await expect(ssiCopilotDraftService.save({ ...shared, expectedModeVersion: 0, text: "test" })).rejects.toThrow()
    await expect(ssiCopilotDraftService.save({ ...shared, text: "   " })).rejects.toThrow()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
  it("returns stale drafts for editing, but hides them outside Copilot", async () => {
    mocks.findFirst.mockResolvedValueOnce(conversation(pending, "copilot", 5))
    await expect(ssiCopilotDraftService.get(shared)).resolves.toEqual(pending)
    mocks.findFirst.mockResolvedValueOnce(conversation(pending, "human_only"))
    await expect(ssiCopilotDraftService.get(shared)).resolves.toBeNull()
  })
})
