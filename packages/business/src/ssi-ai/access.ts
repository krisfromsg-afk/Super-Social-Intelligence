import { and, db, eq, type DatabaseClient } from "@chatbotx.io/database/client"
import { workspaceMemberModel, workspaceModel } from "@chatbotx.io/database/schema"
import { assertSsiId } from "./policy"

/** Real membership only: a platform support session cannot create a human approval. */
export async function assertSsiMember(input: {
  workspaceId: string
  actorId: string
  permission: "contacts" | "manage_ai"
}, tx: DatabaseClient = db): Promise<void> {
  assertSsiId(input.workspaceId)
  assertSsiId(input.actorId)
  const [workspace] = await tx.select({ ownerId: workspaceModel.ownerId }).from(workspaceModel)
    .where(eq(workspaceModel.id, input.workspaceId)).for("share").limit(1)
  if (!workspace) throw new Error("SSI workspace is unavailable")
  if (workspace.ownerId === input.actorId) return
  const [member] = await tx.select({ permissions: workspaceMemberModel.permissions }).from(workspaceMemberModel)
    .where(and(eq(workspaceMemberModel.workspaceId, input.workspaceId), eq(workspaceMemberModel.userId, input.actorId))).for("share").limit(1)
  const p = member?.permissions
  if (p?.superAdmin === true || (input.permission === "contacts" && p?.contacts === true)) return
  throw new Error("SSI operation requires an authorized workspace member")
}
