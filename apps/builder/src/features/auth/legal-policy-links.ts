/**
 * SSI only displays acceptance copy when its operator configured BOTH
 * policy URLs. Never silently attribute another vendor's legal terms to SSI.
 * Reject JS/data links and external plaintext HTTP to avoid downgrade.
 */
function safeLegalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const url = new URL(value)
    if (url.protocol === "https:") return url.href
    if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      return url.href
    }
  } catch {
    return null
  }
  return null
}

export function resolveSsiLegalLinks(input: {
  termsOfService?: string | null
  privacyPolicy?: string | null
}): { termsOfService: string; privacyPolicy: string } | null {
  const termsOfService = safeLegalUrl(input.termsOfService)
  const privacyPolicy = safeLegalUrl(input.privacyPolicy)
  if (!termsOfService || !privacyPolicy) return null
  return { termsOfService, privacyPolicy }
}
