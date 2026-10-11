"use server"

import { conversationService } from "@chatbotx.io/business"
import type { UserModel } from "@chatbotx.io/database/types"
import { z } from "zod"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"

const request = z.object({
  conversationId: z.string().regex(/^\\d+$/),
  expectedVersion: z.number().int().min(0).max(2147483646),
  mode: z.enum(["human_only", "copilot", "autopilot"]),
})
type SsiAiModeRequest = z.infer<typeof request>

/** Workspace-authorized operation; clients never write the control JSON. */
export const setSsiAiModeAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(request)
  .action(async ({
    bindArgsParsedInputs: [workspaceId],
    parsedInput,
    ctx,
  }: {
    bindArgsParsedInputs: WorkspaceIdRequestParams
    parsedInput: SsiAiModeRequest
    ctx: { user: UserModel }
  }) => await conversationService.setSsiAiMode({
    workspaceId,
    id: parsedInput.conversationId,
    mode: parsedInput.mode,
    expectedVersion: parsedInput.expectedVersion,
    userId: ctx.user.id,
  }))
