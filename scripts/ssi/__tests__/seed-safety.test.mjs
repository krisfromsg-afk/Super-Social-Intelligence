import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const seed = readFileSync(new URL("../../../packages/database/src/seed/index.ts", import.meta.url), "utf8")
const compose = readFileSync(new URL("../../../docker-compose.dev.yml", import.meta.url), "utf8")

test("SSI seed does not insert default credential accounts", () => {
  assert.doesNotMatch(seed, /\.insert\s*\(\s*(?:accountModel|userModel)\s*\)/)
  assert.doesNotMatch(seed, /demo@example\.com|Demo@1234/)
  assert.match(seed, /sign-up/)
})

test("local Compose never enables default data seeding", () => {
  assert.match(compose, /RUN_DB_SEED:\s*["']false["']/)
  assert.doesNotMatch(compose, /RUN_DB_SEED:\s*["']true["']/)
  assert.match(compose, /name:\s*ssi-dev/)
})
