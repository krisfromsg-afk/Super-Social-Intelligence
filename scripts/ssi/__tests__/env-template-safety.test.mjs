import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const template = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8")
const vars = Object.fromEntries(
  template.split(/\r?\n/).map((line) => /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line))
    .filter(Boolean).map((match) => [match[1], match[2]]),
)

test("SSI tracked environment cannot serve as a credential-bearing config", () => {
  for (const key of [
    "BETTER_AUTH_SECRET", "ENCRYPTION_KEY",
    "S3_SECRET_ACCESS_KEY", "JAVASCRIPT_EXECUTOR_TOKEN",
    "REALTIME_BROADCAST_SECRET",
  ]) {
    assert.equal(vars[key], "", key + " must remain unset in committed template")
  }
  assert.ok(vars.DATABASE_URL?.includes("replace-me"))
  assert.doesNotMatch(template, /Demo@1234|VLu1KcS63DTTnZU3|16fca8032c77c99a/i)
})
