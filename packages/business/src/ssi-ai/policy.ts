import { createHash } from "node:crypto"

export const SSI_AI_LIMITS = Object.freeze({
  generationsPerHour: 20,
  concurrentGenerations: 2,
  generationTimeoutMs: 45_000,
  approvalLifetimeMs: 15 * 60_000,
  maxOutputTokens: 1200,
  maxInputCharacters: 24_000,
  maxKnowledgeCharacters: 8000,
  maxKnowledgeChunks: 6,
})

export function ssiTextDigest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function canonical(value: unknown, depth = 0): unknown {
  if (depth > 15) throw new Error("SSI data nesting is too deep")
  if (value === null || typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value)) return value.map((item) => canonical(item, depth + 1))
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, item]) => [key, canonical(item, depth + 1)]))
  }
  throw new Error("SSI snapshots must contain plain JSON values")
}

export function ssiSnapshotDigest(value: unknown): string {
  return ssiTextDigest(JSON.stringify(canonical(value)))
}

export function assertSsiId(value: string): void {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
    throw new Error("Invalid SSI resource identifier")
  }
}

export function assertSsiExpectedVersion(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value >= 2147483647) throw new Error("Invalid SSI version")
}

export function assertSsiRequestKey(value: string): void {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(value)) throw new Error("Invalid SSI request key")
}

/** Stop partial/fabricated references from being mistaken for verified citations. */
export function validateSsiCitationMarkers(text: string, available: number): boolean {
  if (!Number.isSafeInteger(available) || available < 0 || available > SSI_AI_LIMITS.maxKnowledgeChunks) return false
  const candidates = text.match(/\[K[^\]\r\n]*(?:\]|$)/g) ?? []
  return (text.match(/\[K/g) ?? []).length === candidates.length && candidates.every((marker) => {
    if (!/^\[K[1-9][0-9]*\]$/.test(marker)) return false
    const n = Number(marker.slice(2, -1))
    return Number.isSafeInteger(n) && n <= available
  })
}

export function isSsiApprovalFresh(reviewedAt: string | undefined, now = new Date()): boolean {
  const at = reviewedAt ? Date.parse(reviewedAt) : Number.NaN
  const age = now.getTime() - at
  return Number.isFinite(at) && age >= 0 && age < SSI_AI_LIMITS.approvalLifetimeMs
}

export function ssiKnowledgeTerms(query: string): string[] {
  return [...new Set(query.normalize("NFKC").toLocaleLowerCase("en-US").match(/[\p{L}\p{N}]{2,40}/gu) ?? [])].slice(0, 12)
}
