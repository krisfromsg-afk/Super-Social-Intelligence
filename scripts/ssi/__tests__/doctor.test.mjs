import { describe, expect, test } from "node:test"
import { strict as assert } from "node:assert"
import { assessLocalConfiguration, readDotEnv } from "../doctor.mjs"

const valid = {
  ENCRYPTION_KEY: "a".repeat(64),
  BETTER_AUTH_SECRET: Buffer.alloc(32, 27).toString("base64"),
  REALTIME_BROADCAST_SECRET: "r".repeat(48),
  JAVASCRIPT_EXECUTOR_TOKEN: "t".repeat(48),
  POSTGRES_PASSWORD: "unique_testing_0123456789",
  DATABASE_URL: "postgresql://chatbotx:unique_testing_0123456789@localhost:5432/chatbotx",
  RUSTFS_SECRET_KEY: "unique_storage_0123456789",
  S3_SECRET_ACCESS_KEY: "unique_storage_0123456789",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "http://localhost:9000",
  NEXT_PUBLIC_BUILDER_URL: "http://localhost:3123",
  PLATFORM_ADMIN_EMAIL: "admin@ssi.test",
}
describe("SSI local diagnostic", () => {
  test("reads dotenv assignments without evaluating shell syntax", () => {
    assert.deepEqual(readDotEnv("KEY=value\n# comment\nNEXT_VALUE='a b'\nBAD-name=x"), { KEY: "value", NEXT_VALUE: "a b" })
  })
  test("valid disposable credentials pass static checks", () => {
    assert.deepEqual(assessLocalConfiguration(valid, { nodeMajor: 24 }).errors, [])
  })
  test("rejects mismatched database/storage credentials and weak secrets", () => {
    const result = assessLocalConfiguration({
      ...valid, POSTGRES_PASSWORD: "wrong_password",
      S3_SECRET_ACCESS_KEY: "secretkey", ENCRYPTION_KEY: "short",
    }, { nodeMajor: 24 })
    assert.equal(result.errors.length >= 3, true)
  })
  test("reports operator email omission without printing credentials", () => {
    const result = assessLocalConfiguration({ ...valid, PLATFORM_ADMIN_EMAIL: "" }, { nodeMajor: 24 })
    assert.equal(result.warnings.length, 1)
    assert.equal(JSON.stringify(result).includes(valid.BETTER_AUTH_SECRET), false)
  })
})
