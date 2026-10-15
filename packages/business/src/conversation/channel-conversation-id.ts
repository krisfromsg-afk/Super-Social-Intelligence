import { and, db, eq, sql, type DatabaseClient } from "@chatbotx.io/database/client"
import { conversationModel } from "@chatbotx.io/database/schema"

/** Merge channel metadata against the locked database row, never a stale
 * Conversation object. Replacing the whole JSON document can roll back a
 * concurrent Human Only takeover or overwrite a newly approved draft. */
export async function mergeChannelConversationId(input: {
  workspaceId: string
  conversationId: string
  channelConversationId: string
  tx?: DatabaseClient
}) {
  const { workspaceId, conversationId, channelConversationId, tx = db } = input
  if (typeof channelConversationId !== "string" || !channelConversationId.trim() || channelConversationId.length > 2048) {
    throw new Error("Invalid channel conversation identifier")
  }
  return tx.update(conversationModel).set({
    additionalAttributes: sql`jsonb_set(
      COALESCE(${conversationModel.additionalAttributes}, '{}'::jsonb),
      '{channelConversationId}', to_jsonb(${channelConversationId}::text), true
    )`,
  }).where(and(
    eq(conversationModel.workspaceId, workspaceId),
    eq(conversationModel.id, conversationId),
  )).returning()
}
