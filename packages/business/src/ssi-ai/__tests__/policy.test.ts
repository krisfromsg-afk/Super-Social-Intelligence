import { describe, expect, it } from "vitest"
import { assertSsiExpectedVersion, assertSsiId, assertSsiRequestKey, isSsiApprovalFresh, ssiKnowledgeTerms, ssiSnapshotDigest, validateSsiCitationMarkers } from "../policy"
import { readSsiCopilotDraft } from "../../conversation/ssi-copilot-draft-state"

describe("SSI AI boundary policy", () => {
  it("hashes canonical data independent of key order without dropping invalid values", () => {
    expect(ssiSnapshotDigest({ b: [1, 2], a: "x" })).toBe(ssiSnapshotDigest({ a: "x", b: [1, 2] }))
    expect(ssiSnapshotDigest({ a: "x", b: [2, 1] })).not.toBe(ssiSnapshotDigest({ a: "x", b: [1, 2] }))
    for (const v of [undefined, Number.NaN, Infinity, new Date(), { a: undefined }]) expect(() => ssiSnapshotDigest(v)).toThrow()
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic
    expect(() => ssiSnapshotDigest(cyclic)).toThrow()
  })
  it("rejects invalid and overflowing identifiers and versions", () => {
    for (const id of ["0", "-1", "1 OR 1=1", "9223372036854775808", "1.2", " 1"]) expect(() => assertSsiId(id)).toThrow()
    expect(() => assertSsiId("9223372036854775807")).not.toThrow()
    for (const v of [-1, 1.5, Number.NaN, 2147483647]) expect(() => assertSsiExpectedVersion(v)).toThrow()
    expect(() => assertSsiExpectedVersion(0)).not.toThrow()
    expect(() => assertSsiRequestKey("request-key-0123456789")).not.toThrow()
    expect(() => assertSsiRequestKey("short")).toThrow()
  })
  it("rejects fabricated, malformed and out-of-range citations", () => {
    expect(validateSsiCitationMarkers("Answer [K1] [K2]", 2)).toBe(true)
    expect(validateSsiCitationMarkers("Insufficient evidence", 0)).toBe(true)
    for (const text of ["[K0]", "[K3]", "[K01]", "[Kfake]", "[K1", "[K1\nbroken]", "[K99999999999999999]"]) expect(validateSsiCitationMarkers(text, 2)).toBe(false)
    expect(validateSsiCitationMarkers("Answer [K1]", 0)).toBe(false)
  })
  it("does not accept expired, future or malformed approvals", () => {
    const now = new Date("2026-10-15T00:15:00Z")
    expect(isSsiApprovalFresh("2026-10-15T00:00:01Z", now)).toBe(true)
    for (const date of [undefined, "invalid", "2026-10-15T00:00:00Z", "2026-10-15T00:15:01Z"]) expect(isSsiApprovalFresh(date, now)).toBe(false)
  })
  it("bounds normalized search terms without raw SQL operators", () => {
    expect(ssiKnowledgeTerms("Hello hello WORLD; select & (!)")).toEqual(["hello", "world", "select"])
    expect(ssiKnowledgeTerms(Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ")).length).toBe(12)
  })
  it("requires AI provenance and review attribution and strips planted fields", () => {
    const draft = { version: 1, modeVersion: 1, origin: "ai", runId: "123", text: "Draft", status: "pending", updatedBy: "456", updatedAt: "2026-10-15T00:00:00Z" }
    expect(readSsiCopilotDraft({ ssiCopilotDraft: { ...draft, secret: "must-not-leak" } })).toEqual(draft)
    expect(readSsiCopilotDraft({ ssiCopilotDraft: { ...draft, runId: undefined } })).toBe("invalid")
    expect(readSsiCopilotDraft({ ssiCopilotDraft: { ...draft, status: "approved_not_sent" } })).toBe("invalid")
    expect(readSsiCopilotDraft({ ssiCopilotDraft: { ...draft, status: "approved_not_sent", reviewedBy: "456", reviewedAt: draft.updatedAt } })).not.toBe("invalid")
  })
})
