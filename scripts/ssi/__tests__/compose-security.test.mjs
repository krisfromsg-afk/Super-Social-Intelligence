import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const root = new URL("../../../", import.meta.url)
const base = readFileSync(new URL("docker-compose.yml", root), "utf8")
const dev = readFileSync(new URL("docker-compose.dev.yml", root), "utf8")

test("Compose requires secrets with no fixed fallback credentials", () => {
  assert.doesNotMatch(base + dev, /:-secretkey|:-change-me-in-production/)
  for (const name of ["POSTGRES_PASSWORD", "RUSTFS_SECRET_KEY", "JAVASCRIPT_EXECUTOR_TOKEN"]) {
    assert.match(base + dev, new RegExp("\\$\\{" + name + ":\\?"))
  }
})

test("all published ports in base and developer Compose bind to loopback", () => {
  for (const source of [base, dev]) {
    const portBlocks = [...source.matchAll(/^\s+ports:\s*\n((?:\s+-[^\n]+\n)+)/gm)]
    assert.ok(portBlocks.length > 0, "Expected at least one published port block")
    for (const match of portBlocks) {
      const entries = match[1].split("\n").filter((line) => line.trim().startsWith("- "))
      assert.ok(entries.length > 0)
      for (const line of entries) {
        assert.match(line, /127\.0\.0\.1:/, "Non-loopback port mapping: " + line)
      }
    }
  }
})
