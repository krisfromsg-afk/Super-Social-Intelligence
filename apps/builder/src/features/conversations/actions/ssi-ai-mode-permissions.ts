import type { SsiAiMode } from "@chatbotx.io/business/conversation"
import {
  hasContactsAccess,
  hasWorkspacePermission,
  type PermissionsInput,
} from "@/lib/auth/permission-routes"

/**
 * Member authentication alone does not grant permission to re-arm an
 * autonomous sender. Human-only is a safety stop available to inbox members;
 * all AI activation requires flows-authoring or workspace-admin privileges.
 * Support impersonation cannot modify automation ownership.
 */
export function assertSsiAiModePermission(
  permissions: PermissionsInput,
  mode: SsiAiMode,
  isSupportSession = false,
): void {
  if (isSupportSession) throw new Error("Unauthorized SSI AI mode change")
  if (mode === "human_only") {
    if (hasContactsAccess(permissions)) return
  } else if (
    (mode === "copilot" || mode === "autopilot") &&
    hasWorkspacePermission(permissions, "flows")
  ) {
    return
  }
  throw new Error("Unauthorized SSI AI mode change")
}
