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

/** Turn automated responses off until a human explicitly re-enables them. */
export const keepHumanOnlyAction = workspaceActionClient
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
      ctx: { user: UserModel }
    }) => {
      await conversationService.setBotEnabledByIds({
        workspaceId,
        ids: parsedInput.ids,
        botEnabled: false,
        botResumeAt: null,
        userId: ctx.user.id,
        triggerContext: {
          triggerSource: "api",
          triggerHandler: "keepHumanOnlyAction",
          triggerType: "conversation_transferred_to_human",
        },
      })
    },
  )
