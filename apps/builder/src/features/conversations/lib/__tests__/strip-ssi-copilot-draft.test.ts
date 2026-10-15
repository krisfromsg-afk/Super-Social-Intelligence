import { describe, expect, it } from "vitest"
import { stripSsiCopilotDraftFromMetadata } from "../strip-ssi-copilot-draft"

describe("SSI private draft metadata redaction", () => {
  it("removes private text from API-visible conversation JSON without mutating source", () => {
    const original = {
      ssiAiControl: { mode: "copilot", version: 2 },
      challenge: { type: "step" },
      ssiCopilotDraft: { text: "Private customer reply", status: "pending" },
    }
    const sanitized = stripSsiCopilotDraftFromMetadata(original)
    expect(sanitized).not.toHaveProperty("ssiCopilotDraft")
    expect(sanitized).toMatchObject({ ssiAiControl: original.ssiAiControl, challenge: original.challenge })
    expect(original.ssiCopilotDraft.text).toBe("Private customer reply")
  })
  it("passes legacy metadata and null through unchanged", () => {
    const existing = { ssiAiControl: { mode: "human_only", version: 1 } }
    expect(stripSsiCopilotDraftFromMetadata(existing)).toBe(existing)
    expect(stripSsiCopilotDraftFromMetadata(null)).toBeNull()
  })
})
