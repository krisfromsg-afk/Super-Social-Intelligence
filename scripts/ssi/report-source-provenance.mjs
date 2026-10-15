#!/usr/bin/env node
/**
 * Git-tree provenance inventory, not legal clearance.
 * Reads only tracked paths and license/package metadata; outputs NO credentials.
 * Keeps known excluded commercial subtrees as a hard CI failure.
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const git = (...args) => execFileSync("git", ["-C", root, ...args], {
  encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
}).trim()
const tracked = execFileSync("git", ["-C", root, "ls-files", "-z"], {
  encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
}).split("\0").filter(Boolean).sort()
const licRe = /(?:^|\/)(?:LICEN[SC]E|NOTICE|COPYING)(?:\.[A-Za-z0-9_-]+)?$/i
const hash = (source) => createHash("sha256").update(source).digest("hex")
const licenseFiles = tracked.filter((p) => licRe.test(p)).map((path) => {
  const content = readFileSync(join(root, path), "utf8")
  return {
    path,
    sha256: hash(content),
    nested: path.includes("/"),
    knownCommercialPhrase: /ChatbotX Commercial License/i.test(content),
    recognizedMarker: /\b(?:MIT|Apache|GPL|BSD|ISC|MPL)\b/i.test(content),
  }
})
const packageManifests = tracked.filter((p) =>
  /(?:^|\/)package\.json$/.test(p) &&
  /^(?:apps|packages|integrations)\//.test(p)
).map((path) => {
  const data = JSON.parse(readFileSync(join(root, path), "utf8"))
  return { path, name: data.name ?? null, license: data.license ?? null }
})
const forbidden = /^(?:apps\/builder\/src\/enterprise|packages\/database\/src\/(?:schema|relations)\/enterprise)(?:\/|$)/
const restrictedPaths = tracked.filter((path) => forbidden.test(path))
const nestedCommercial = licenseFiles.filter((file) => file.nested && file.knownCommercialPhrase)
const rootLicense = licenseFiles.find((file) => file.path === "LICENSE")
const rootNotice = rootLicense && readFileSync(join(root, "LICENSE"), "utf8")
const violations = []
if (!rootNotice?.includes("Copyright (c) 2024-present AhaChat LLC.")) {
  violations.push("Upstream copyright not preserved in root LICENSE")
}
if (restrictedPaths.length > 0) violations.push("Restricted commercial source paths are tracked")
if (nestedCommercial.length > 0) violations.push("Nested ChatbotX Commercial License still tracked")
const report = {
  sourceCommit: git("rev-parse", "HEAD"),
  scope: "Tracked repository source and package license declarations only",
  legalClearance: "NOT_ESTABLISHED; requires review of upstream scope, assets, third-party dependencies and public history",
  thirdPartyTransitiveDependencies: "NOT_SCANNED_BY_THIS_SCRIPT",
  summary: {
    trackedFiles: tracked.length,
    licenseAndNoticeFiles: licenseFiles.length,
    packageManifests: packageManifests.length,
    packageManifestsWithoutLicenseField: packageManifests.filter((x) => !x.license).length,
    violations: violations.length,
  },
  licenseFiles, packageManifests, restrictedPaths, violations,
}
console.log(JSON.stringify(report, null, 2))
if (violations.length) process.exitCode = 1
