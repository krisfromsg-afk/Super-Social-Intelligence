import { describe, expect, test } from "vitest"
import { assertSsiCopilotDraftAccess } from "../../ssi-copilot-draft-permissions"

describe("SSI staged draft workspace authorization", () => {
  test("full contacts access and admin can read, stage and review", () => {
    for (const permissions of [{ contacts: true }, { superAdmin: true }]) {
      expect(() => assertSsiCopilotDraftAccess(permissions)).not.toThrow()
    }
  })
  test("no role, flow editor and assigned-only users are denied", () => {
    for (const permissions of [{}, { flows: true }, { onlyAssignedContacts: true }]) {
      expect(() => assertSsiCopilotDraftAccess(permissions)).toThrow()
    }
  })
  test("synthetic platform support cannot approve drafts", () => {
    expect(() => assertSsiCopilotDraftAccess({ superAdmin: true }, true)).toThrow()
  })
})
