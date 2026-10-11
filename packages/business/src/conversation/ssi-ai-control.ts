/**
 * SSI-authored safe default for queued, automated outbound messages.
 *
 * The legacy bot flag is checked freshly at the provider dispatch boundary.
 * A scheduled pause requires an explicit successful CAS resume (botEnabled=true)
 * before dispatch; an expired timestamp on a stale queue payload is NEVER
 * sufficient. Copilot may draft only: no metadata-provided "approved" flag
 * permits this automated dispatch path.
 *
 * This gate is deliberately a PRE-DISPATCH safety layer, NOT a transactional
 * outbox/approval implementation. A takeover racing an in-flight provider
 * request still needs the final send-claim design (P2.4/P2.5).
 */
export type SsiAiMode = "human_only" | "copilot" | "autopilot"

export type SsiAiControl = {
  mode: SsiAiMode
  version: number
}

export function readSsiAiControl(
  attributes: unknown,
): SsiAiControl | null | "invalid" {
  if (attributes === null || attributes === undefined) return null
  if (typeof attributes !== "object" || Array.isArray(attributes)) return "invalid"
  if (!Object.prototype.hasOwnProperty.call(attributes, "ssiAiControl")) return null
  const control = (attributes as Record<string, unknown>).ssiAiControl
  if (!control || typeof control !== "object" || Array.isArray(control)) return "invalid"
  const { mode, version } = control as Record<string, unknown>
  if (mode !== "human_only" && mode !== "copilot" && mode !== "autopilot") return "invalid"
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1) return "invalid"
  return { mode, version }
}

export function isSsiAutomatedSendAllowed(conversation: {
  botEnabled: boolean
  additionalAttributes?: unknown
}): boolean {
  if (conversation.botEnabled !== true) return false
  const control = readSsiAiControl(conversation.additionalAttributes)
  if (control === "invalid") return false
  // Backward-compatible legacy conversations have no explicit SSI mode.
  return control === null || control.mode === "autopilot"
}
