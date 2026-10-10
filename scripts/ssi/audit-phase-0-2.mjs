#!/usr/bin/env node
/**
 * SSI Phase 00-02 evidence gate.
 *
 * Reads actual tracked source at HEAD. "verified" always has mandatory source
 * witnesses; external deployment/legal gates stay partial/blocked until there
 * is independent proof. No amount of green unit CI changes those statuses.
 *
 * Commands:
 *   node scripts/ssi/audit-phase-0-2.mjs
 *   node scripts/ssi/audit-phase-0-2.mjs --strict
 *
 * --strict is deliberately STOP-SHIP while any phase has open acceptance
 * criteria. Reports JSON so CI logs/artifacts can be inspected and compared.
 */
import { existsSync, readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const relative = (path) => join(root, path)
const exists = (path) => existsSync(relative(path))
const contains = (path, snippet) =>
  exists(path) && readFileSync(relative(path), "utf8").includes(snippet)
const git = (...args) =>
  execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim()

const excludedPaths = [
  "apps/builder/src/enterprise",
  "packages/database/src/schema/enterprise",
  "packages/database/src/relations/enterprise",
]
const prohibited = / (?:apps\/builder\/src\/enterprise|packages\/database\/src\/(?:schema|relations)\/enterprise)\//
const requiredPaths = [
  "apps/builder/package.json",
  "apps/worker/package.json",
  "packages/database/src/schema/ssi-platform/models.ts",
  "packages/database/src/schema/index.ts",
  "packages/database/src/relations/ssi-platform/index.ts",
  "LICENSE",
  "docs/ssi/MASTER_PLAN.md",
  "docs/ssi/PHASE02_COMPLETION_PLAN.md",
]
const violations = []
for (const path of excludedPaths) {
  if (exists(path)) violations.push("Restricted source in tree: " + path)
}
for (const path of requiredPaths) {
  if (!exists(path)) violations.push("Missing required source witness: " + path)
}
if (!contains("LICENSE", "Copyright (c) 2024-present AhaChat LLC.")) {
  violations.push("Upstream copyright/MIT provenance missing")
}
let reachableObjects = ""
let head = "unknown"
try {
  head = git("rev-parse", "HEAD")
  reachableObjects = git("rev-list", "--objects", "HEAD")
  for (const line of reachableObjects.split("\n")) {
    if (prohibited.test(line)) {
      violations.push("Restricted source in reachable Git commit history: " + line)
      break
    }
  }
} catch (error) {
  violations.push("Could not verify Git HEAD/ancestry: " + String(error))
}
const evidence = (files) => files.map((p) => ({ path: p, present: exists(p) }))
const rows = []
function record(phase, id, status, statement, files, reason) {
  const witnesses = evidence(files)
  if (status === "verified" && witnesses.some((x) => !x.present)) {
    violations.push(id + " is VERIFIED despite missing source witnesses")
  }
  rows.push({ phase, id, status, statement, evidence: witnesses, remaining: reason })
}
// A source witness is NOT evidence of a fully certified production system.
record("00", "P0-1", "verified", "SSI plan, code snapshot and provenance notice exist",
  ["LICENSE", "docs/ssi/MASTER_PLAN.md", "apps/builder/package.json", "packages/database/src/schema/ssi-platform/models.ts"],
  "Snapshot lives in draft PR, not main")
record("00", "P0-2", "verified", "Known forbidden source trees omitted from clean branch",
  [".github/workflows/ssi-commercial-source-boundary.yml", "docs/ssi/COMMERCIAL_SOURCE_BOUNDARY.md"],
  "Automated negative checks run above; cannot adjudicate all licenses")
record("00", "P0-3", "blocked", "Full copyright scope, third-party artifacts and cached historical PR objects",
  ["docs/ssi/UPSTREAM_POLICY.md"], "Issue #4; external provenance review and GitHub retention cleanup absent")
record("00", "P0-4", "partial", "Package, build, static regression baselines",
  [".github/workflows/ssi-foundation-ci.yml", ".github/workflows/ssi-regression.yml"],
  "Targeted CI passes, but lint/secret/dependency audits and actual deployment are not fully certified")
record("01", "P1-1", "partial", "SSI name, logo and web manifest rebrand",
  ["apps/builder/public/brand/logo.svg", "apps/builder/public/brand/favicon/site.webmanifest"],
  "Six legacy favicon assets remain identical to pinned ChatbotX upstream")
record("01", "P1-2", "blocked", "Complete link, email, i18n and product namespace migration",
  ["package.json", "apps/builder/package.json"],
  "Internal @chatbotx.io packages remain for compatibility; full marketing/link/localization sweep not signed off")
record("01", "P1-3", "partial", "Schema/model compatibility",
  ["packages/database/scripts/check-schema-drift.mjs", "packages/database/src/schema/ssi-platform/models.ts"],
  "Drizzle snapshot drift check passed; real PostgreSQL migration, data-preservation and rollback not tested here")
record("01", "P1-4", "blocked", "Deployment, login/dashboard/worker/inbox smoke and branding/legal URLs",
  ["docker-compose.yml", "apps/builder/src/app/layout.tsx"],
  "No recorded staging login, worker + Redis/Postgres health or official policies")
record("02", "P2-0", "partial", "Omnichannel Inbox baseline",
  ["apps/builder/src/features/chat/chat-panes.tsx", "apps/builder/src/features/conversations/conversation-filter.tsx"],
  "Existing Community UI and unit tests; no SSI browser/mobile acceptance")
record("02", "P2-1", "verified", "Persisted outbound sender categories are displayed honestly",
  ["apps/builder/src/features/ssi-inbox/message-provenance.ts", "apps/builder/src/features/ssi-inbox/__tests__/message-provenance.test.ts"],
  "Sender bot includes both flows and AI, not a verified LLM/model label")
record("02", "P2-2", "partial", "Indefinite Human Only, enable, cross-tab and CAS",
  ["apps/builder/src/features/conversations/actions/keep-human-only.action.ts",
    "apps/builder/src/features/ssi-inbox/__tests__/human-only.test.ts"],
  "Focused tests exist; atomic send suppression in all dispatchers and live race E2E not proven")
record("02", "P2-3", "blocked", "Message-to-model/flow durable verified provenance",
  ["apps/builder/src/features/ssi-inbox/bot-activity-panel.tsx"],
  "Panel explicitly labels real bot messages only, says LLM/tool/RAG provenance not available")
record("02", "P2-4", "blocked", "Persistent Human/Copilot/Autopilot modes and server-enforced send policy",
  ["docs/ssi/PHASE02_COMPLETION_PLAN.md"], "Three-state SSI policy, server-wide dispatch guard and proofs absent")
record("02", "P2-5", "blocked", "Idempotent AI draft approve/edit/reject queue",
  ["docs/ssi/PHASE02_COMPLETION_PLAN.md"], "No accepted implementation or E2E for lifecycle/stale approval")
record("02", "P2-6", "blocked", "Authorized model/tool/retrieval trace viewer",
  ["docs/ssi/PHASE02_COMPLETION_PLAN.md"], "Secure persisted trace/read API and tenancy tests not accepted")
record("02", "P2-7", "partial", "Official channel contracts, OAuth/webhooks and retries",
  ["integrations/messenger/__tests__/connection-oauth.test.ts", "integrations/instagram/__tests__/smoke.test.ts"],
  "Upstream unit fixtures exist, but live provider account/scopes/signatures/canary not certified for SSI")
record("02", "P2-8", "partial", "Inbox filters, responsiveness, a11y and Vietnamese i18n",
  ["apps/builder/src/features/conversations/conversation-filter.tsx"],
  "No multi-device keyboard/a11y/language acceptance suite")
record("02", "P2-9", "blocked", "Security, PostgreSQL E2E, concurrency and canary release gate",
  ["packages/database/__tests__/integration/thread-control-guarded-update.test.ts"],
  "DB integration suite skips without DATABASE_URL; no real staging or browser E2E signoff")

const legacyIconBlobIds = new Map([
  ["apps/builder/public/brand/favicon/apple-touch-icon.png", "05145841d27a55cd7b0f3d3be5c3d4dd42f1c009"],
  ["apps/builder/public/brand/favicon/favicon-96x96.png", "8a6755b0ec46326ea40d24490fb7a8f7ad7b95d3"],
  ["apps/builder/public/brand/favicon/favicon.ico", "291e76ac10e9dc26e3a638110bd218d764e451dc"],
  ["apps/builder/public/brand/favicon/favicon.svg", "6d1ab815be7b0205c93425fefd54d268bd8fcd04"],
  ["apps/builder/public/brand/favicon/web-app-manifest-192x192.png", "20d0d48e933f7192b1deafe9a0bc61f5b0fad3e5"],
  ["apps/builder/public/brand/favicon/web-app-manifest-512x512.png", "0f6138fe4c927d14e3827a8c8b0ecc3568b9e560"],
])
const oldIcons = []
for (const [path, upstreamBlob] of legacyIconBlobIds) {
  if (!exists(path)) continue
  try {
    if (git("hash-object", path) === upstreamBlob) oldIcons.push(path)
  } catch (error) {
    violations.push("Could not inspect legacy icon SHA: " + String(error))
  }
}
if (oldIcons.length === 0) {
  const brand = rows.find((x) => x.id === "P1-1")
  brand.remaining = "Brand and fallback links still require UI/marketing acceptance"
}
const count = (status) => rows.filter((x) => x.status === status).length
const accepted = violations.length === 0 && count("partial") === 0 && count("blocked") === 0
const result = {
  report: "SSI Phase 00-02 acceptance",
  commit: head,
  reviewedAt: "2026-10-10",
  strictReleaseReady: accepted,
  summary: { verified: count("verified"), partial: count("partial"), blocked: count("blocked"), violations: violations.length },
  oldIconFilesMatchingChatbotX: oldIcons,
  violations,
  milestones: rows,
}
console.log(JSON.stringify(result, null, 2))
if (violations.length) {
  console.error("CHECKPOINT EVIDENCE INVARIANT FAILURE:", violations.join(" | "))
  process.exit(2)
}
if (process.argv.includes("--strict") && !accepted) {
  console.error("STOP-SHIP: Phase 00-02 acceptance incomplete; see milestones and open issues #3/#4.")
  process.exit(1)
}
