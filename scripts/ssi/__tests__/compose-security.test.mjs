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

test("all local port mappings bind to loopback explicitly", () => {
  for (const source of [base, dev]) {
    for (const line of source.split("\n")) {
      if (!/^\s+-\s+["']?(?:\$\{|\d+)/.test(line)) continue
      if (!/\d+:[0-9]+/.test(line)) continue
      assert.match(line, /127\.0\.0\.1:/, "Non-loopback port mapping: " + line)
    }
  }
})
