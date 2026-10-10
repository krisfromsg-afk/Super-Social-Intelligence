import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const dir = join(root, "public/brand/favicon")
const binary = (name: string) => readFileSync(join(dir, name))
const signature = [137, 80, 78, 71, 13, 10, 26, 10]

describe("SSI brand/favicon production asset integrity", () => {
  it.each([
    ["favicon-96x96.png", 96],
    ["apple-touch-icon.png", 180],
    ["web-app-manifest-192x192.png", 192],
    ["web-app-manifest-512x512.png", 512],
  ] as const)("%s is a valid-size indexed PNG", (filename, size) => {
    const bytes = binary(filename)
    expect([...bytes.subarray(0, 8)]).toEqual(signature)
    expect(bytes.toString("ascii", 12, 16)).toBe("IHDR")
    expect(bytes.readUInt32BE(16)).toBe(size)
    expect(bytes.readUInt32BE(20)).toBe(size)
    expect(bytes[25]).toBe(3) // indexed PNG, not a placeholder renamed file
  })

  it("includes a real PNG inside the 32x32 ICO fallback", () => {
    const bytes = binary("favicon.ico")
    expect(bytes.readUInt16LE(0)).toBe(0)
    expect(bytes.readUInt16LE(2)).toBe(1)
    expect(bytes.readUInt16LE(4)).toBe(1)
    expect(bytes[6]).toBe(32)
    expect(bytes[7]).toBe(32)
    const length = bytes.readUInt32LE(14)
    const offset = bytes.readUInt32LE(18)
    expect(offset).toBe(22)
    expect(length + offset).toBe(bytes.length)
    expect([...bytes.subarray(offset, offset + 8)]).toEqual(signature)
  })

  it("uses SSI-owned SVG and correctly declared PWA raster icons", () => {
    const icon = readFileSync(join(root, "public/brand/icon_black.svg"), "utf8")
    const favicon = readFileSync(join(dir, "favicon.svg"), "utf8")
    expect(favicon.trim()).toBe(icon.trim())
    expect(favicon).toContain('aria-label="SSI"')
    const manifest = JSON.parse(readFileSync(join(dir, "site.webmanifest"), "utf8"))
    expect(manifest.name).toBe("Super Social Intelligence")
    for (const iconEntry of manifest.icons as { src: string; type: string }[]) {
      expect(iconEntry.src.startsWith("/brand/favicon/")).toBe(true)
      expect(existsSync(join(root, "public", iconEntry.src.slice(1)))).toBe(true)
      expect(["image/svg+xml", "image/png"]).toContain(iconEntry.type)
    }
  })

  it("preserves tenant favicon overrides without assuming their MIME type", () => {
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8")
    expect(layout).toContain("icons: faviconUrl")
    expect(layout).toContain("{ url: faviconUrl }")
    expect(layout).toContain("/brand/favicon/apple-touch-icon.png")
  })
})
