import { describe, expect, it } from "vitest"
import { isSsiAutomatedSendAllowed, readSsiAiControl } from "../ssi-ai-control"

describe("SSI automated outbound policy", () => {
  it("permits only freshly enabled legacy or versioned Autopilot", () => {
    expect(isSsiAutomatedSendAllowed({ botEnabled: true })).toBe(true)
    expect(isSsiAutomatedSendAllowed({ botEnabled: true, additionalAttributes: {
      ssiAiControl: { mode: "autopilot", version: 1 },
    } })).toBe(true)
  })

  it.each(["human_only", "copilot"] as const)("blocks %s even when a legacy toggle is enabled", (mode) => {
    expect(isSsiAutomatedSendAllowed({ botEnabled: true, additionalAttributes: {
      ssiAiControl: { mode, version: 2 },
    } })).toBe(false)
  })

  it("requires botEnabled=true even after a legacy timed pause expired", () => {
    expect(isSsiAutomatedSendAllowed({ botEnabled: false, additionalAttributes: {
      ssiAiControl: { mode: "autopilot", version: 1 },
    } })).toBe(false)
    expect(isSsiAutomatedSendAllowed({ botEnabled: false })).toBe(false)
  })

  it("fails closed on malformed and tampered control JSON", () => {
    for (const control of [[], "autopilot", {}, { mode: "autopilot", version: 0 },
      { mode: "autopilot", version: "1" }, { mode: "fake", version: 3 }]) {
      expect(readSsiAiControl({ ssiAiControl: control })).toBe("invalid")
      expect(isSsiAutomatedSendAllowed({ botEnabled: true, additionalAttributes: { ssiAiControl: control } })).toBe(false)
    }
  })

  it("does not read inherited prototype values as trusted policy", () => {
    const poisoned = Object.create({ ssiAiControl: { mode: "autopilot", version: 2 } })
    expect(readSsiAiControl(poisoned)).toBeNull()
  })
})
