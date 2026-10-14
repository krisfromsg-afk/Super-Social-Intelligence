import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const root = new URL("../../../apps/builder/src/features/conversations/actions/", import.meta.url)
const expected = {
  "set-ssi-ai-mode.action.ts": "parsedInput.mode",
  "enable-bot.action.ts": '"autopilot"',
  "disable-bot.action.ts": '"human_only"',
  "keep-human-only.action.ts": '"human_only"',
}

test("all SSI and legacy bot mode server actions enforce resolved member RBAC", () => {
  for (const [path, mode] of Object.entries(expected)) {
    const contents = readFileSync(new URL(path, root), "utf8")
    assert.match(contents, /assertSsiAiModePermission\(/, path)
    assert.match(contents, /ctx\.workspaceMemberPermissions/, path)
    assert.match(contents, /ctx\.isSupportSession/, path)
    assert.ok(contents.includes(mode), path + " missing expected permission mode")
    assert.match(contents, /workspaceActionClient/, path)
  }
})
