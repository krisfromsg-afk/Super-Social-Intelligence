import { describe, expect, it } from "vitest"
import { isConversationActive } from "@/features/conversations/utils/bot-state"

describe("SSI Human Only state", () => {
  it("stays disabled without an auto-resume deadline", () => {
    expect(isConversationActive({ botEnabled: false, botResumeAt: null })).toBe(false)
  })
  it("respects a future pause deadline", () => {
    expect(isConversationActive({
      botEnabled: false, botResumeAt: new Date(Date.now() + 60_000),
    })).toBe(false)
  })
  it("resumes only after a temporary pause expires", () => {
    expect(isConversationActive({
      botEnabled: false, botResumeAt: new Date(Date.now() - 60_000),
    })).toBe(true)
  })
  it("permits explicit re-enablement", () => {
    expect(isConversationActive({ botEnabled: true, botResumeAt: null })).toBe(true)
  })
})
