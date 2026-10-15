import { expect, it, vi } from "vitest"

// Unrelated public API suites intentionally mock only the database operations
// they use. Importing the shared business barrel must not construct Copilot SQL.
vi.mock("@chatbotx.io/database/client", () => ({
  db: {},
  and: vi.fn(),
  eq: vi.fn(),
  sql: vi.fn(() => { throw new Error("SQL evaluated at module import") }),
}))
vi.mock("@chatbotx.io/database/schema", () => ({
  conversationModel: { additionalAttributes: "additionalAttributes" },
}))

it("loads the Copilot service without evaluating SQL or touching the database", async () => {
  const { ssiCopilotDraftService } = await import("../../../packages/business/src/conversation/ssi-copilot-draft-service")
  const { sql } = await import("@chatbotx.io/database/client")
  expect(sql).not.toHaveBeenCalled()
  expect(typeof ssiCopilotDraftService.get).toBe("function")
  expect(typeof ssiCopilotDraftService.save).toBe("function")
  expect(typeof ssiCopilotDraftService.review).toBe("function")
})
