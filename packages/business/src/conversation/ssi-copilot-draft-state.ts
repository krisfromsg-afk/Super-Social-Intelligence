/** The UI's private staging projection. An approval is NOT a delivery receipt. */
export type SsiCopilotDraftStatus = "pending" | "approved_not_sent" | "rejected"
export type SsiCopilotDraft = {
  version: number
  modeVersion: number
  text: string
  origin: "operator" | "ai"
  status: SsiCopilotDraftStatus
  updatedBy: string
  updatedAt: string
  reviewedBy?: string
  reviewedAt?: string
  runId?: string
  derivedFromRunId?: string
  inputLastMessageId?: string
}

export function readSsiCopilotDraft(attributes: unknown): SsiCopilotDraft | null | "invalid" {
  if (attributes == null) return null
  if (typeof attributes !== "object" || Array.isArray(attributes)) return "invalid"
  if (!Object.prototype.hasOwnProperty.call(attributes, "ssiCopilotDraft")) return null
  const value = (attributes as Record<string, unknown>).ssiCopilotDraft
  if (!value || typeof value !== "object" || Array.isArray(value)) return "invalid"
  const v = value as Record<string, unknown>
  const version = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 1 && n <= 2147483647
  if (!version(v.version) || !version(v.modeVersion)) return "invalid"
  if (typeof v.text !== "string" || !v.text.trim() || v.text.length > 8000) return "invalid"
  if (v.origin !== "operator" && v.origin !== "ai") return "invalid"
  if (v.status !== "pending" && v.status !== "approved_not_sent" && v.status !== "rejected") return "invalid"
  if (typeof v.updatedBy !== "string" || !v.updatedBy.trim()) return "invalid"
  if (typeof v.updatedAt !== "string" || !Number.isFinite(Date.parse(v.updatedAt))) return "invalid"
  for (const key of ["reviewedBy", "runId", "derivedFromRunId", "inputLastMessageId"] as const) {
    if (v[key] !== undefined && (typeof v[key] !== "string" || !/^[1-9][0-9]{0,18}$/.test(v[key]))) return "invalid"
  }
  if (v.origin === "ai" && !v.runId) return "invalid"
  if (v.reviewedAt != null && (typeof v.reviewedAt !== "string" || !Number.isFinite(Date.parse(v.reviewedAt)))) return "invalid"
  if (v.status !== "pending" && (!v.reviewedBy || !v.reviewedAt)) return "invalid"
  // Copy a whitelist, never expose arbitrary JSONB fields or planted secrets.
  return Object.fromEntries([
    "version", "modeVersion", "text", "origin", "status", "updatedBy", "updatedAt",
    "reviewedBy", "reviewedAt", "runId", "derivedFromRunId", "inputLastMessageId",
  ].filter((key) => v[key] !== undefined).map((key) => [key, v[key]])) as SsiCopilotDraft
}

export function validateSsiCopilotDraftInput(input: {
  expectedDraftVersion: number
  expectedModeVersion: number
  text?: string
}): void {
  const validVersion = (v: number, canBeZero = false) =>
    Number.isSafeInteger(v) && v >= (canBeZero ? 0 : 1) && v < 2147483647
  if (!validVersion(input.expectedDraftVersion, true) || !validVersion(input.expectedModeVersion)) throw new Error("Invalid Copilot draft version")
  if (input.text !== undefined && (typeof input.text !== "string" || !input.text.trim() || input.text.length > 8000)) throw new Error("Copilot draft text must be 1-8000 characters")
}
