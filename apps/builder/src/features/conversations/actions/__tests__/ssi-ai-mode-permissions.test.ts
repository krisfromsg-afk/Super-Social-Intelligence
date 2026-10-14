import { describe, expect, it } from "vitest"
import { assertSsiAiModePermission } from "../ssi-ai-mode-permissions"

describe("SSI AI ownership permissions", () => {
  const inboxOnly = { onlyAssignedContacts: true }
  const flowEditor = { flows: true }
  const admin = { superAdmin: true }
  const empty = {}

  it.each([inboxOnly, { contacts: true }, flowEditor, admin])(
    "lets an authorized inbox or operations member stop automation",
    (permissions) => {
      // Flow editors with no inbox rights must not stop others' conversations.
      if ("flows" in permissions && !("superAdmin" in permissions) && !("contacts" in permissions)) {
        expect(() => assertSsiAiModePermission(permissions, "human_only")).toThrow("Unauthorized")
      } else {
        expect(() => assertSsiAiModePermission(permissions, "human_only")).not.toThrow()
      }
    },
  )

  it.each(["copilot", "autopilot"] as const)(
    "permits %s activation for flow editors or workspace admins only",
    (mode) => {
      for (const permissions of [flowEditor, admin]) {
        expect(() => assertSsiAiModePermission(permissions, mode)).not.toThrow()
      }
      for (const permissions of [inboxOnly, { contacts: true }, empty]) {
        expect(() => assertSsiAiModePermission(permissions, mode)).toThrow("Unauthorized")
      }
    },
  )

  it("rejects every mutation from impersonated support sessions", () => {
    for (const mode of ["human_only", "copilot", "autopilot"] as const) {
      expect(() => assertSsiAiModePermission(admin, mode, true)).toThrow("Unauthorized")
    }
  })

  it("rejects missing permissions and unknown mode values", () => {
    expect(() => assertSsiAiModePermission(empty, "human_only")).toThrow("Unauthorized")
    expect(() => assertSsiAiModePermission(admin, "unrecognized" as never)).toThrow("Unauthorized")
  })
})
