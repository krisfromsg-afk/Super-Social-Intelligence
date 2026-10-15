"use server"

import { ssiCopilotDraftService } from "@chatbotx.io/business"
import type { UserModel } from "@chatbotx.io/database/types"
import { z } from "zod"
import { type WorkspaceIdRequestParams, workspaceIdrequestParams } from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"
import { assertSsiCopilotDraftAccess } from "../ssi-copilot-draft-permissions"

const request = z.object({
  conversationId: z.string().regex(/^\d+$/),
  expectedModeVersion: z.number().int().min(1).max(2147483646),
  expectedDraftVersion: z.number().int().min(1).max(2147483646),
  decision: z.enum(["approve", "reject"]),
})

export const reviewSsiCopilotDraftAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(request)
  .action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput, ctx }: {
    bindArgsParsedInputs: WorkspaceIdRequestParams
    parsedInput: z.infer<typeof request>
    ctx: { user: UserModel; workspaceMemberPermissions: Record<string, unknown>; isSupportSession: boolean }
  }) => {
    assertSsiCopilotDraftAccess(ctx.workspaceMemberPermissions, ctx.isSupportSession)
    return ssiCopilotDraftService.review({
      workspaceId, conversationId: parsedInput.conversationId, actorId: ctx.user.id,
      expectedModeVersion: parsedInput.expectedModeVersion,
      expectedDraftVersion: parsedInput.expectedDraftVersion, decision: parsedInput.decision,
    })
  })
