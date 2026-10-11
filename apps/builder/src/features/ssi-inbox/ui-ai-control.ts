/** UI-only parser. The server owns writes and authoritative policy checks. */
export type SsiUiControl = {
  mode: "human_only" | "copilot" | "autopilot"
  version: number
}
export function readSsiUiControl(attributes: unknown): SsiUiControl | null {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return null
  const control = (attributes as Record<string, unknown>).ssiAiControl
  if (!control || typeof control !== "object" || Array.isArray(control)) return null
  const record = control as Record<string, unknown>
  if (record.mode !== "human_only" && record.mode !== "copilot" && record.mode !== "autopilot") return null
  if (typeof record.version !== "number" || !Number.isSafeInteger(record.version) || record.version < 1) return null
  return { mode: record.mode, version: record.version }
}
