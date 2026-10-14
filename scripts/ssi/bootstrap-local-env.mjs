#!/usr/bin/env node
/**
 * Generate an isolated, local-only SSI .env. This must never overwrite an
 * existing environment or be used as a production secret provisioner.
 */
import { randomBytes } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))
const envFile = join(root, ".env")
let env = await readFile(join(root, ".env.example"), "utf8")

const set = (name, value) => {
  const line = new RegExp(`^${name}=.*$`, "m")
  if (!line.test(env)) throw new Error(`Missing expected .env.example key: ${name}`)
  env = env.replace(line, `${name}=${value}`)
}

const dbPassword = randomBytes(24).toString("hex")
const storagePassword = randomBytes(24).toString("hex")
set("BETTER_AUTH_SECRET", randomBytes(32).toString("base64"))
set("ENCRYPTION_KEY", randomBytes(32).toString("hex"))
set("JAVASCRIPT_EXECUTOR_TOKEN", randomBytes(32).toString("hex"))
set("REALTIME_BROADCAST_SECRET", randomBytes(32).toString("hex"))
set("DATABASE_URL", `postgresql://chatbotx:${dbPassword}@localhost:5432/chatbotx?schema=public`)
set("S3_ACCESS_KEY_ID", "chatbotx")
set("S3_SECRET_ACCESS_KEY", storagePassword)
// MailHog accepts unauthenticated SMTP on the local development port.
set("SMTP_SERVER", "smtp://localhost:1025")
env += `
# Local-only credentials consumed by docker-compose.yml
POSTGRES_DB=chatbotx
POSTGRES_USER=chatbotx
POSTGRES_PASSWORD=${dbPassword}
RUSTFS_ACCESS_KEY=chatbotx
RUSTFS_SECRET_KEY=${storagePassword}
`
try {
  // Exclusive write prevents overwriting operator secrets or customer config.
  await writeFile(envFile, env, { flag: "wx", mode: 0o600 })
} catch (error) {
  if (error?.code === "EEXIST") {
    console.error("Refusing to overwrite existing .env. Back it up manually if this is a fresh disposable environment.")
    process.exitCode = 1
  } else {
    throw error
  }
}
if (process.exitCode !== 1) {
  console.log("Created private .env for LOCAL development only.")
  console.log("Set PLATFORM_ADMIN_EMAIL in .env before starting Docker; do not deploy with this file.")
}
