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
  assert.match(service, /draftVersionGuard\(props\.expectedDraftVersion\)/)
  assert.match(service, /copilotModeGuard\(props\.expectedModeVersion\)/)
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
