import { hasWorkspacePermission, type PermissionsInput } from "@/lib/auth/permission-routes"

/**
 * Unlike the emergency Human Only stop, draft text and review decisions are
 * tenant data. Assigned-only inbox users are deliberately denied until an
 * assigned-conversation scope query is implemented.
 */
export function assertSsiCopilotDraftAccess(
  permissions: PermissionsInput,
  isSupportSession = false,
): void {
  if (isSupportSession || !hasWorkspacePermission(permissions, "contacts")) {
    throw new Error("Copilot draft requires full contacts access")
  }
}
