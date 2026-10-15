/**
 * Sensitive staging text is not general Conversation metadata.
 * All conversation API responses must strip it, including workspace-token
 * reads and assigned-only Inbox views. Draft actions have their own RBAC.
 */
export function stripSsiCopilotDraftFromMetadata<T extends Record<string, unknown> | null>(
  attributes: T,
): T {
  if (!attributes || !Object.prototype.hasOwnProperty.call(attributes, "ssiCopilotDraft")) {
    return attributes
  }
  const safe = { ...attributes }
  delete safe.ssiCopilotDraft
  return safe as T
}
