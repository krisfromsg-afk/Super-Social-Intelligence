import { describe, expect, it } from "vitest"
import { readSsiCopilotDraft, validateSsiCopilotDraftInput } from "../ssi-copilot-draft-state"

const valid = {
  version: 1,
  modeVersion: 2,
  text: "Xin chào, em có thể hỗ trợ gì?",
  origin: "operator",
  status: "pending",
  updatedBy: "321",
  updatedAt: "2026-10-14T00:00:00.000Z",
}

describe("SSI staged Copilot draft validation", () => {
  it("distinguishes absent draft from invalid stored metadata", () => {
    expect(readSsiCopilotDraft(null)).toBeNull()
    expect(readSsiCopilotDraft({ arbitrary: true })).toBeNull()
    expect(readSsiCopilotDraft({ ssiCopilotDraft: null })).toBe("invalid")
    expect(readSsiCopilotDraft({ ssiCopilotDraft: [] })).toBe("invalid")
  })
  it("allows only explicitly attributed operator drafts", () => {
    expect(readSsiCopilotDraft({ ssiCopilotDraft: valid })).toEqual(valid)
    for (const update of [
      { origin: "ai" }, { version: 0 }, { version: 1.5 },
      { modeVersion: 0 }, { status: "sent" }, { text: "" },
      { text: "x".repeat(8001) }, { updatedAt: "bad date" },
    ]) {
      expect(readSsiCopilotDraft({ ssiCopilotDraft: { ...valid, ...update } })).toBe("invalid")
    }
  })
  it("requires optimistic versions and bounded nonempty text", () => {
    expect(() => validateSsiCopilotDraftInput({ expectedModeVersion: 1, expectedDraftVersion: 0, text: "Hi" })).not.toThrow()
    for (const bad of [
      { expectedModeVersion: 0, expectedDraftVersion: 0, text: "x" },
      { expectedModeVersion: 1, expectedDraftVersion: -1, text: "x" },
      { expectedModeVersion: 1, expectedDraftVersion: 1.5, text: "x" },
      { expectedModeVersion: 1, expectedDraftVersion: 0, text: "  " },
      { expectedModeVersion: 1, expectedDraftVersion: 0, text: "x".repeat(8001) },
    ]) expect(() => validateSsiCopilotDraftInput(bad)).toThrow()
  })
})
