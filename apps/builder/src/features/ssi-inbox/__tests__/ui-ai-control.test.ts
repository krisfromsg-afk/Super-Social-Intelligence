import { describe, expect, it } from "vitest"
import { readSsiUiControl } from "../ui-ai-control"

describe("SSI Inbox mode controls", () => {
  it("reads current CAS version and mode from persisted row", () => {
    expect(readSsiUiControl({ ssiAiControl: { mode: "copilot", version: 2 } }))
      .toEqual({ mode: "copilot", version: 2 })
  })
  it("does not trust malformed UI payloads", () => {
    for (const attributes of [
      null, [], { ssiAiControl: ["autopilot"] },
      { ssiAiControl: { mode: "autopilot", version: 0 } },
      { ssiAiControl: { mode: "unknown", version: 3 } },
    ]) expect(readSsiUiControl(attributes)).toBeNull()
  })
})
