import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
const path = "packages/business/src/conversation/service.ts"
const blob = (text) => createHash("sha1").update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest("hex")
let text = readFileSync(path, "utf8")
if (blob(text) !== "0ed435eb4e94ba9b651358fc7b480dfa1ed4bc67") throw new Error("Conversation source changed; manual review required")
const replacements = [
  ['import { BaseService } from "../base.service"\n', 'import { BaseService } from "../base.service"\nimport { mergeChannelConversationId } from "./channel-conversation-id"\n'],
  ['    const updated = await tx\n      .update(conversationModel)\n      .set({\n        additionalAttributes: {\n          ...conversation.additionalAttributes,\n          channelConversationId,\n        },\n      })\n      .where(eq(conversationModel.id, conversation.id))\n      .returning()\n      .then((result) => result[0])',
   '    const [updated] = await mergeChannelConversationId({\n      workspaceId: conversation.workspaceId,\n      conversationId: conversation.id,\n      channelConversationId,\n      tx,\n    })'],
]
for (const [before, after] of replacements) {
  if (text.split(before).length !== 2) throw new Error("Expected one exact replacement")
  text = text.replace(before, after)
}
if (blob(text) !== "b11093ffc14d6169a89fd7d8339204413d1bc4b0") throw new Error("Patched source differs from reviewed result")
writeFileSync(path, text)
