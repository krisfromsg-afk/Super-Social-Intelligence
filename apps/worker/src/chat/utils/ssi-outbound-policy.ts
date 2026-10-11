import { conversationService, isSsiAutomatedSendAllowed } from "@chatbotx.io/business"
import { ChannelError, ChannelErrorCategory } from "@chatbotx.io/sdk"

/** Re-read workspace-scoped DB state before any provider API call. */
export async function assertSsiAutomatedDispatchAllowed(input: {
  workspaceId: string
  conversationId: string
}): Promise<void> {
  const conversation = await conversationService.findByUncached({
    where: { id: input.conversationId, workspaceId: input.workspaceId },
  })
  // Missing rows, DB errors and malformed SSI controls never authorize a send.
  if (!conversation || !isSsiAutomatedSendAllowed(conversation)) {
    throw new ChannelError(
      "Automated send blocked by current conversation ownership",
      ChannelErrorCategory.PERMISSION_DENIED,
      { code: "ssi_automated_dispatch_blocked" },
    )
  }
}
