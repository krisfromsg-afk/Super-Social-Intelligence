import { describe, expect, it } from "vitest"
import { getSsiBotRealtimePatch } from "../bot-realtime-patch"

describe("SSI cross-tab bot ownership synchronization", () => {
  it("synchronizes indefinite Human Only without an auto-resume deadline", () => {
    expect(getSsiBotRealtimePatch({ botEnabled: false, botResumeAt: null })).toEqual({
      botEnabled: false,
      botResumeAt: null,
    })
  })

  it("preserves the deadline on a temporary pause", () => {
    const iso = "2026-10-11T10:00:00.000Z"
    expect(getSsiBotRealtimePatch({ botEnabled: false, botResumeAt: iso })).toEqual({
      botEnabled: false,
      botResumeAt: new Date(iso),
    })
  })

  it("propagates explicit reactivation", () => {
    expect(getSsiBotRealtimePatch({ botEnabled: true, botResumeAt: null })).toEqual({
      botEnabled: true,
      botResumeAt: null,
    })
  })

  it("rejects ambiguous legacy events, read-only updates and invalid timestamps", () => {
    expect(getSsiBotRealtimePatch({ botEnabled: false })).toBeNull()
    expect(getSsiBotRealtimePatch({ agentLastReadAt: null })).toBeNull()
    expect(getSsiBotRealtimePatch({ botEnabled: false, botResumeAt: "invalid" })).toBeNull()
  })
})
