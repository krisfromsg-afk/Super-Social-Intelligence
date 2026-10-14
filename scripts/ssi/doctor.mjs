#!/usr/bin/env node
/**
 * Local operator diagnosis. Never prints tokens, URLs with credentials, or
 * the contents of .env. Never changes files or talks to public providers.
 */
import { readFile } from "node:fs/promises"
import { connect } from "node:net"
import { fileURLToPath } from "node:url"
import { join } from "node:path"

export function readDotEnv(contents) {
  const entries = {}
  for (const line of contents.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    entries[match[1]] = value
  }
  return entries
}

const isPlaceholder = (value) => !value ||
  /(?:change-me|secretkey|password|replace-me|example\.com)/i.test(value)

export function assessLocalConfiguration(vars, { nodeMajor = Number(process.versions.node.split(".")[0]) } = {}) {
  const errors = []
  const warnings = []
  if (nodeMajor < 24) errors.push("Node.js 24+ is required by this repository")
  if (!/^[\da-f]{64}$/i.test(vars.ENCRYPTION_KEY ?? "")) errors.push("ENCRYPTION_KEY must be 32 bytes in hex")
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(vars.BETTER_AUTH_SECRET ?? "") ||
      Buffer.from(vars.BETTER_AUTH_SECRET ?? "", "base64").length !== 32) {
    errors.push("BETTER_AUTH_SECRET must decode to exactly 32 bytes")
  }
  for (const name of ["REALTIME_BROADCAST_SECRET", "JAVASCRIPT_EXECUTOR_TOKEN"]) {
    const value = vars[name] ?? ""
    if (value.length < 32 || isPlaceholder(value)) errors.push(name + " must be a unique, non-placeholder secret")
  }
  for (const name of ["POSTGRES_PASSWORD", "RUSTFS_SECRET_KEY", "S3_SECRET_ACCESS_KEY"]) {
    if (isPlaceholder(vars[name])) errors.push(name + " is missing or uses a sample password")
  }
  const urls = {}
  for (const [name, scheme] of [
    ["DATABASE_URL", /^postgres(?:ql)?:$/],
    ["REDIS_URL", /^rediss?:$/],
    ["S3_ENDPOINT", /^https?:$/],
    ["NEXT_PUBLIC_BUILDER_URL", /^https?:$/],
  ]) {
    try {
      const url = new URL(vars[name])
      if (!scheme.test(url.protocol) || !url.hostname) throw Error("bad protocol")
      urls[name] = url
    } catch {
      errors.push(name + " must be a valid URL of the expected protocol")
    }
  }
  if (urls.DATABASE_URL && vars.POSTGRES_PASSWORD &&
      decodeURIComponent(urls.DATABASE_URL.password) !== vars.POSTGRES_PASSWORD) {
    errors.push("DATABASE_URL and POSTGRES_PASSWORD disagree")
  }
  if (vars.S3_SECRET_ACCESS_KEY && vars.RUSTFS_SECRET_KEY &&
      vars.S3_SECRET_ACCESS_KEY !== vars.RUSTFS_SECRET_KEY) {
    errors.push("S3_SECRET_ACCESS_KEY and RUSTFS_SECRET_KEY disagree")
  }
  if (!vars.PLATFORM_ADMIN_EMAIL) warnings.push("Set PLATFORM_ADMIN_EMAIL before first login")
  if (vars.PLATFORM_ADMIN_EMAIL && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vars.PLATFORM_ADMIN_EMAIL)) {
    errors.push("PLATFORM_ADMIN_EMAIL is not a valid email")
  }
  if (urls.NEXT_PUBLIC_BUILDER_URL?.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(urls.NEXT_PUBLIC_BUILDER_URL.hostname)) {
    warnings.push("Non-local builder URL uses unencrypted HTTP")
  }
  return { errors, warnings, urls }
}

function probeTcp(url, fallbackPort) {
  return new Promise((resolve) => {
    const port = Number(url.port || fallbackPort)
    const socket = connect({ host: url.hostname, port })
    let finished = false
    const done = (ok) => {
      if (finished) return
      finished = true
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(1500, () => done(false))
    socket.on("connect", () => done(true))
    socket.on("error", () => done(false))
  })
}

const path = fileURLToPath(new URL("../../.env", import.meta.url))
const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (invoked) {
  const args = new Set(process.argv.slice(2))
  const errors = []
  const warnings = []
  let urls = {}
  try {
    const vars = readDotEnv(await readFile(path, "utf8"))
    const result = assessLocalConfiguration(vars)
    errors.push(...result.errors)
    warnings.push(...result.warnings)
    urls = result.urls
  } catch {
    errors.push("Missing or unreadable .env; run pnpm ssi:bootstrap on a new development checkout")
  }
  if (args.has("--live") && errors.length === 0) {
    for (const [name, port] of [["DATABASE_URL", 5432], ["REDIS_URL", 6379], ["S3_ENDPOINT", 9000]]) {
      if (!(await probeTcp(urls[name], port))) errors.push(name + " is unreachable from this machine")
    }
    try {
      const health = new URL("/api/health", urls.NEXT_PUBLIC_BUILDER_URL)
      const res = await fetch(health, { signal: AbortSignal.timeout(2500) })
      if (!res.ok) throw Error("unhealthy")
    } catch {
      errors.push("Builder health endpoint did not respond successfully")
    }
  }
  const output = { status: errors.length ? "error" : warnings.length ? "warning" : "ok", errors, warnings, live: args.has("--live") }
  console.log(JSON.stringify(output, null, 2))
  if (errors.length || (args.has("--strict") && warnings.length)) process.exitCode = 1
}
