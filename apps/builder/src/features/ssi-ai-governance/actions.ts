"use server"

import { ssiKnowledgeService, ssiPersonaService } from "@chatbotx.io/business/ssi-ai"
import { zodBigintAsString } from "@chatbotx.io/utils"
import { z } from "zod"
import { workspaceActionClient } from "@/lib/safe-action"

const id = zodBigintAsString()
const request = z.object({
  kind: z.enum(["persona", "knowledge"]), resourceId: id,
  operation: z.enum(["inspect", "publish"]),
  expectedVersion: z.number().int().min(0).max(2147483646).optional(),
  expectedDigest: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  rollbackOfVersion: z.number().int().min(1).max(2147483646).optional(),
})

export const ssiAiGovernanceAction = workspaceActionClient.bindArgsSchemas([id]).inputSchema(request).action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput: input, ctx }) => {
  if (ctx.isSupportSession || ctx.workspaceMemberPermissions.superAdmin !== true) throw new Error("AI publication requires workspace administration access")
  if (input.operation === "inspect") {
    if (input.kind === "persona") {
      const ref = { workspaceId, agentId: input.resourceId }
      return { kind: "persona" as const, operation: "inspect" as const, ...await ssiPersonaService.inspect(ref), versions: await ssiPersonaService.versions(ref) }
    }
    const ref = { workspaceId, fileId: input.resourceId }
    return { kind: "knowledge" as const, operation: "inspect" as const, ...await ssiKnowledgeService.inspect(ref), versions: await ssiKnowledgeService.versions(ref) }
  }
  if (input.expectedVersion === undefined || input.expectedDigest === undefined) throw new Error("Inspect and review a version before publication")
  const common = { workspaceId, actorId: ctx.user.id, expectedVersion: input.expectedVersion, expectedDigest: input.expectedDigest }
  if (input.kind === "persona") return { kind: "persona" as const, operation: "publish" as const, ...await ssiPersonaService.publish({ ...common, agentId: input.resourceId, rollbackOfVersion: input.rollbackOfVersion }) }
  if (input.rollbackOfVersion !== undefined) throw new Error("Knowledge rollback requires republishing reviewed source content")
  return { kind: "knowledge" as const, operation: "publish" as const, ...await ssiKnowledgeService.publish({ ...common, fileId: input.resourceId }) }
})
