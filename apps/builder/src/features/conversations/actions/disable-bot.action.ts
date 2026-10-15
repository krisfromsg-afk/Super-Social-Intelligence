"use server"

import { conversationService } from "@chatbotx.io/business"
import type { UserModel } from "@chatbotx.io/database/types"
import {
  type BulkUpdateIdsRequest,
  bulkUpdateIdsRequest,
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"
import { assertSsiAiModePermission } from "./ssi-ai-mode-permissions"

export const disableBotAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(bulkUpdateIdsRequest)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId],
      parsedInput,
      ctx,
    }: {
      bindArgsParsedInputs: WorkspaceIdRequestParams
      parsedInput: BulkUpdateIdsRequest
      ctx: { user: UserModel; workspaceMemberPermissions: Record<string, unknown>; isSupportSession: boolean }
    }) => {
      assertSsiAiModePermission(ctx.workspaceMemberPermissions, "human_only", ctx.isSupportSession)
      await conversationService.setBotEnabledByIds({
        workspaceId,
        ids: parsedInput.ids,
        botEnabled: false,
        userId: ctx.user.id,
        triggerContext: {
          triggerSource: "api",
          triggerHandler: "disableBotAction",
          triggerType: "conversation_transferred_to_human",
        },
      })
    },
  )
