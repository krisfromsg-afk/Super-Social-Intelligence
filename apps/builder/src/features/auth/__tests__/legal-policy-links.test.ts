import { describe, expect, it } from "vitest"
import { resolveSsiLegalLinks } from "../legal-policy-links"

describe("SSI signup legal-link provenance", () => {
  it("renders only explicit trusted https URLs", () => {
    expect(resolveSsiLegalLinks({
      termsOfService: "https://example.test/terms",
      privacyPolicy: "https://example.test/privacy",
    })).toEqual({
      termsOfService: "https://example.test/terms",
      privacyPolicy: "https://example.test/privacy",
    })
  })
  it("allows HTTP only for localhost development", () => {
    expect(resolveSsiLegalLinks({
      termsOfService: "http://localhost:3123/terms",
      privacyPolicy: "http://127.0.0.1:3123/privacy",
    })).not.toBeNull()
  })
  it.each([
    { termsOfService: null, privacyPolicy: null },
    { termsOfService: "https://example.test/terms", privacyPolicy: undefined },
    { termsOfService: "javascript:alert(1)", privacyPolicy: "https://example.test/privacy" },
    { termsOfService: "http://example.test/terms", privacyPolicy: "https://example.test/privacy" },
    { termsOfService: "https://example.test/terms", privacyPolicy: "data:text/html,foo" },
  ])("does not claim acceptance without two safe policies (%o)", (input) => {
    expect(resolveSsiLegalLinks(input)).toBeNull()
  })
})
