import { beforeEach, describe, expect, it, vi } from "vitest"

const findByUncached = vi.hoisted(() => vi.fn())
const isSsiAutomatedSendAllowed = vi.hoisted(() => vi.fn())
vi.mock("@chatbotx.io/business", () => ({
  conversationService: { findByUncached },
  isSsiAutomatedSendAllowed,
}))
vi.mock("@chatbotx.io/sdk", () => ({
  ChannelError: class ChannelError extends Error {},
  ChannelErrorCategory: { PERMISSION_DENIED: "permission_denied" },
}))
const { assertSsiAutomatedDispatchAllowed, assertSsiAutomatedMessageEnvelopeBound } = await import("./ssi-outbound-policy")

beforeEach(() => {
  findByUncached.mockReset()
  isSsiAutomatedSendAllowed.mockReset()
})
describe("SSI last-mile send gate", () => {
  it("uses fresh workspace-scoped database state, not queued conversation", async () => {
    const current = { botEnabled: true }
    findByUncached.mockResolvedValue(current)
    isSsiAutomatedSendAllowed.mockReturnValue(true)
    await assertSsiAutomatedDispatchAllowed({ workspaceId: "ws-a", conversationId: "conv-1" })
    expect(findByUncached).toHaveBeenCalledExactlyOnceWith({
      where: { id: "conv-1", workspaceId: "ws-a" },
    })
    expect(isSsiAutomatedSendAllowed).toHaveBeenCalledWith(current)
  })
  it("blocks when the conversation was handed off after job enqueue", async () => {
    findByUncached.mockResolvedValue({ botEnabled: false })
    isSsiAutomatedSendAllowed.mockReturnValue(false)
    await expect(assertSsiAutomatedDispatchAllowed({
      workspaceId: "ws-a", conversationId: "conv-1",
    })).rejects.toThrow("Automated send blocked")
  })
  it("blocks missing or cross-tenant conversations", async () => {
    findByUncached.mockResolvedValue(undefined)
    await expect(assertSsiAutomatedDispatchAllowed({
      workspaceId: "ws-other", conversationId: "conv-1",
    })).rejects.toThrow("Automated send blocked")
    expect(isSsiAutomatedSendAllowed).not.toHaveBeenCalled()
  })
  it("fails closed when the database is unavailable", async () => {
    findByUncached.mockRejectedValue(new Error("DB unavailable"))
    await expect(assertSsiAutomatedDispatchAllowed({
      workspaceId: "ws-a", conversationId: "conv-1",
    })).rejects.toThrow("DB unavailable")
  })
})


describe("SSI outbound envelope tenant binding", () => {
  const correct = {
    workspaceId: "ws-a", conversationId: "conv-1",
    messageWorkspaceId: "ws-a", messageConversationId: "conv-1",
  }
  it("accepts a message bound to the currently selected conversation", () => {
    expect(() => assertSsiAutomatedMessageEnvelopeBound(correct)).not.toThrow()
  })
  it.each([
    { messageWorkspaceId: "ws-b" },
    { messageConversationId: "conv-2" },
    { messageWorkspaceId: "" },
    { messageConversationId: "" },
  ])("rejects inconsistent automated message envelope %o", (change) => {
    expect(() => assertSsiAutomatedMessageEnvelopeBound({ ...correct, ...change }))
      .toThrow("Automated message does not belong")
  })
})
