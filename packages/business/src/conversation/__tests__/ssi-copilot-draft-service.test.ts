import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  returning: vi.fn(),
  findFirst: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
}))
vi.mock("@chatbotx.io/database/client", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings: Array.from(strings), values,
  }),
  and: (...clauses: unknown[]) => ({ and: clauses }),
  eq: (column: unknown, value: unknown) => ({ eq: [column, value] }),
  db: {
    query: { conversationModel: { findFirst: mocks.findFirst } },
    update: () => ({
      set: (mutation: unknown) => {
        mocks.set(mutation)
        return {
          where: (predicate: unknown) => {
            mocks.where(predicate)
            return { returning: () => mocks.returning() }
          },
        }
      },
    }),
  },
}))
vi.mock("@chatbotx.io/database/schema", () => ({
  conversationModel: {
    id: "id", workspaceId: "workspaceId",
    botEnabled: "botEnabled", additionalAttributes: "additionalAttributes",
  },
}))
const { ssiCopilotDraftService } = await import("../ssi-copilot-draft-service")

const shared = {
  workspaceId: "123", conversationId: "456", actorId: "789",
  expectedModeVersion: 4, expectedDraftVersion: 0,
}

beforeEach(() => {
  mocks.returning.mockReset()
  mocks.findFirst.mockReset()
  mocks.set.mockReset()
  mocks.where.mockReset()
  mocks.returning.mockResolvedValue([{ id: "456" }])
})

describe("SSI Copilot staging service (NO dispatch)", () => {
  it("stages a human-authored suggestion and guards workspace + mode + draft CAS", async () => {
    const draft = await ssiCopilotDraftService.save({ ...shared, text: "Hello there" })
    expect(draft).toMatchObject({
      origin: "operator", status: "pending",
      modeVersion: 4, version: 1, text: "Hello there",
    })
    const sqlShape = JSON.stringify(mocks.where.mock.calls[0])
    expect(sqlShape).toContain("workspaceId")
    expect(sqlShape).toContain("conversationId")
    expect(sqlShape).toContain("copilot")
    expect(sqlShape).toContain("botEnabled")
    expect(sqlShape).toContain("ssiCopilotDraft")
    expect(sqlShape).toContain("ssiAiControl")
    expect(mocks.set).toHaveBeenCalledTimes(1)
  })

  it("records approval as approved_not_sent and never publishes delivery", async () => {
    const verdict = await ssiCopilotDraftService.review({
      ...shared, expectedDraftVersion: 1, decision: "approve",
    })
    expect(verdict).toEqual({ version: 2, status: "approved_not_sent" })
    const predicate = JSON.stringify(mocks.where.mock.calls[0])
    expect(predicate).toContain("pending")
    expect(predicate).toContain("modeVersion")
    expect(mocks.set).toHaveBeenCalledTimes(1)
  })

  it("fails closed on concurrent edits and approvals", async () => {
    mocks.returning.mockResolvedValue([])
    await expect(ssiCopilotDraftService.save({
      ...shared, text: "A",
    })).rejects.toThrow("refresh and retry")
    await expect(ssiCopilotDraftService.review({
      ...shared, expectedDraftVersion: 1, decision: "reject",
    })).rejects.toThrow("refresh and retry")
  })

  it("blocks blank draft and invalid mode revision before a database operation", async () => {
    await expect(ssiCopilotDraftService.save({
      ...shared, expectedModeVersion: 0, text: "test",
    })).rejects.toThrow()
    await expect(ssiCopilotDraftService.save({
      ...shared, text: "   ",
    })).rejects.toThrow()
    expect(mocks.set).not.toHaveBeenCalled()
  })

  it("only exposes draft when the current Copilot mode version matches", async () => {
    const data = {
      version: 2, modeVersion: 4, origin: "operator",
      text: "Draft", status: "approved_not_sent",
      updatedBy: "789", updatedAt: "2026-10-14T00:00:00.000Z",
    }
    mocks.findFirst.mockResolvedValueOnce({
      botEnabled: false,
      additionalAttributes: { ssiAiControl: { mode: "copilot", version: 4 }, ssiCopilotDraft: data },
    })
    await expect(ssiCopilotDraftService.get({
      workspaceId: "123", conversationId: "456",
    })).resolves.toEqual(data)
    mocks.findFirst.mockResolvedValueOnce({
      botEnabled: false,
      additionalAttributes: { ssiAiControl: { mode: "copilot", version: 5 }, ssiCopilotDraft: data },
    })
    await expect(ssiCopilotDraftService.get({
      workspaceId: "123", conversationId: "456",
    })).resolves.toBeNull()
    mocks.findFirst.mockResolvedValueOnce({
      botEnabled: false,
      additionalAttributes: { ssiAiControl: { mode: "human_only", version: 4 }, ssiCopilotDraft: data },
    })
    await expect(ssiCopilotDraftService.get({
      workspaceId: "123", conversationId: "456",
    })).resolves.toBeNull()
  })
})
