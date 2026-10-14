/**
 * One staged Copilot suggestion per conversation, stored in Conversation JSONB.
 * Operator-origin only until verified LLM provenance is wired in.
 * Approval is a RECORD OF REVIEW, never authorization to call a provider.
 * A dedicated append-only audit table + transactional outbox are still required
 * before enabling external sends or treating this as a production approval queue.
 */
export type SsiCopilotDraftStatus = "pending" | "approved_not_sent" | "rejected"
export type SsiCopilotDraft = {
  version: number
  modeVersion: number
  text: string
  origin: "operator"
  status: SsiCopilotDraftStatus
  updatedBy: string
  updatedAt: string
  reviewedBy?: string
  reviewedAt?: string
}

export function readSsiCopilotDraft(attributes: unknown): SsiCopilotDraft | null | "invalid" {
  if (attributes == null) return null
  if (typeof attributes !== "object" || Array.isArray(attributes)) return "invalid"
  if (!Object.prototype.hasOwnProperty.call(attributes, "ssiCopilotDraft")) return null
  const value = (attributes as Record<string, unknown>).ssiCopilotDraft
  if (!value || typeof value !== "object" || Array.isArray(value)) return "invalid"
  const v = value as Record<string, unknown>
  if (typeof v.version !== "number" || !Number.isSafeInteger(v.version) || v.version < 1) return "invalid"
  if (typeof v.modeVersion !== "number" || !Number.isSafeInteger(v.modeVersion) || v.modeVersion < 1) return "invalid"
  if (typeof v.text !== "string" || !v.text.trim() || v.text.length > 8000) return "invalid"
  if (v.origin !== "operator") return "invalid"
  if (v.status !== "pending" && v.status !== "approved_not_sent" && v.status !== "rejected") return "invalid"
  if (typeof v.updatedBy !== "string" || !v.updatedBy) return "invalid"
  if (typeof v.updatedAt !== "string" || !Number.isFinite(Date.parse(v.updatedAt))) return "invalid"
  if (v.reviewedBy != null && (typeof v.reviewedBy !== "string" || !v.reviewedBy)) return "invalid"
  if (v.reviewedAt != null && (typeof v.reviewedAt !== "string" || !Number.isFinite(Date.parse(v.reviewedAt)))) return "invalid"
  return v as SsiCopilotDraft
}

export function validateSsiCopilotDraftInput(input: {
  expectedDraftVersion: number
  expectedModeVersion: number
  text?: string
}): void {
  const validVersion = (v: number, canBeZero = false) =>
    Number.isSafeInteger(v) && v >= (canBeZero ? 0 : 1) && v < 2147483647
  if (!validVersion(input.expectedDraftVersion, true) || !validVersion(input.expectedModeVersion)) {
    throw new Error("Invalid Copilot draft version")
  }
  if (input.text !== undefined && (!input.text.trim() || input.text.length > 8000)) {
    throw new Error("Copilot draft text must be 1–8000 characters")
  }
}
