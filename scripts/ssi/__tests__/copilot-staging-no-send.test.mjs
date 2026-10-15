import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const root = new URL("../../../", import.meta.url)
const contents = (path) => readFileSync(new URL(path, root), "utf8")
const service = contents("packages/business/src/conversation/ssi-copilot-draft-service.ts")
const review = contents("apps/builder/src/features/conversations/actions/review-ssi-copilot-draft.action.ts")
const panel = contents("apps/builder/src/features/ssi-inbox/copilot-draft-panel.tsx")

test("review is deliberately a no-send status transition", () => {
  assert.match(service, /approved_not_sent/)
  assert.match(service, /ssiCopilotDraftService/)
  // The previous SQL-only CAS is now a row-locked transaction with a durable
  // revision. Assert its replacement, not the removed helper's spelling.
  // Executable unit and real-PostgreSQL race tests independently check behavior.
  const lock = service.slice(service.indexOf("export async function lockSsiCopilotConversation"), service.indexOf("export async function persistSsiCopilotRevision"))
  assert.match(lock, /\.for\("update"\)/)
  assert.match(lock, /eq\(conversationModel\.workspaceId, input\.workspaceId\)/)
  assert.match(lock, /eq\(conversationModel\.id, input\.conversationId\)/)
  assert.match(lock, /control\.version !== input\.expectedModeVersion/)
  assert.match(lock, /\(draft\?\.version \?\? 0\) !== input\.expectedDraftVersion/)
  assert.match(lock, /control\.mode !== "copilot"/)
  assert.match(lock, /conversation\.botEnabled/)
  const transition = service.slice(service.indexOf("  async review("))
  assert.match(transition, /db\.transaction\(async \(tx\) =>/)
  assert.match(transition, /await assertSsiMember\(/)
  assert.match(transition, /await lockSsiCopilotConversation\(input, tx\)/)
  assert.match(transition, /await persistSsiCopilotRevision\(input, revised, input\.decision, conversation\.additionalAttributes, tx\)/)
  assert.match(review, /ssiCopilotDraftService\.review\(/)
  assert.match(panel, /Approve \(no send\)/)
})

test("staging service and review action cannot enqueue or deliver", () => {
  for (const [name, source] of [["service", service], ["review", review]]) {
    assert.doesNotMatch(source, /from ["']@chatbotx\.io\/worker-config["']/, name)
    assert.doesNotMatch(source, /\b(?:createOutgoing|sendMessageToChannel|messageQueue|chatQueue|notificationQueue|enqueueSend|publishToChannel)\b/, name)
    assert.doesNotMatch(source, /\.add(?:Bulk)?\s*\(/, name)
  }
})
