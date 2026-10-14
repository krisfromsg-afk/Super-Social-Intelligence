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


/** Prevent a stale or malformed queued bot payload from borrowing another
 * conversation's authorization. Message hypertables intentionally have no
 * conversation FK; the worker must check tenant and conversation coherence.
 */
export function assertSsiAutomatedMessageEnvelopeBound(input: {
  workspaceId: string
  conversationId: string
  messageWorkspaceId: string
  messageConversationId: string
}): void {
  if (
    !input.workspaceId || !input.conversationId ||
    input.messageWorkspaceId !== input.workspaceId ||
    input.messageConversationId !== input.conversationId
  ) {
    throw new ChannelError(
      "Automated message does not belong to the queued conversation",
      ChannelErrorCategory.PERMISSION_DENIED,
      { code: "ssi_automated_envelope_mismatch" },
    )
  }
}
