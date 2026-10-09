import type { RealtimeEventConversationUpdatedChanges } from "@chatbotx.io/partysocket-config"

/**
 * Decode the complete server-persisted bot state, not only the boolean.
 * An old event with no pause deadline is ambiguous and must be ignored.
 */
export function getSsiBotRealtimePatch(
  changes: RealtimeEventConversationUpdatedChanges,
): { botEnabled: boolean; botResumeAt: Date | null } | null {
  if (typeof changes.botEnabled !== "boolean" || !("botResumeAt" in changes)) {
    return null
  }
  if (changes.botResumeAt === null) {
    return { botEnabled: changes.botEnabled, botResumeAt: null }
  }
  if (typeof changes.botResumeAt !== "string") {
    return null
  }
  const date = new Date(changes.botResumeAt)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return { botEnabled: changes.botEnabled, botResumeAt: date }
}
