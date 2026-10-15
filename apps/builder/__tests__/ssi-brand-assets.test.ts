import { readFileSync, existsSync } from "node:fs"
import { createHash } from "node:crypto"
import { join } from "node:path"
import { inflateSync } from "node:zlib"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const dir = join(root, "public/brand/favicon")
const binary = (name: string) => readFileSync(join(dir, name))
const signature = [137, 80, 78, 71, 13, 10, 26, 10]

// PNG signatures alone cannot prove the pixel data is usable. Validate every
// chunk's CRC, the zlib stream and the complete indexed scanline payload.
const crc32 = (data: Buffer): number => {
  let checksum = 0xffffffff
  for (const byte of data) {
    checksum ^= byte
    for (let j = 0; j < 8; j++) {
      checksum =
        checksum & 1
          ? (checksum >>> 1) ^ 0xedb88320
          : checksum >>> 1
    }
  }
  return (checksum ^ 0xffffffff) >>> 0
}

const validatePng = (bytes: Buffer, size: number) => {
  expect([...bytes.subarray(0, 8)]).toEqual(signature)
  expect(bytes.readUInt32BE(16)).toBe(size)
  expect(bytes.readUInt32BE(20)).toBe(size)
  expect(bytes[24]).toBe(2) // two-bit indexed palette
  expect(bytes[25]).toBe(3)

  let offset = 8
  let foundEnd = false
  const data: Buffer[] = []
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset)
    const chunkEnd = offset + 12 + length
    expect(chunkEnd).toBeLessThanOrEqual(bytes.length)
    const chunkType = bytes.toString("ascii", offset + 4, offset + 8)
    const chunkBody = bytes.subarray(offset + 4, offset + 8 + length)
    expect(bytes.readUInt32BE(offset + 8 + length)).toBe(crc32(chunkBody))
    if (chunkType === "IDAT") data.push(bytes.subarray(offset + 8, offset + 8 + length))
    if (chunkType === "IEND") foundEnd = true
    offset = chunkEnd
  }
  expect(offset).toBe(bytes.length)
  expect(foundEnd).toBe(true)
  const raw = inflateSync(Buffer.concat(data))
  const stride = Math.ceil((size * 2) / 8)
  expect(raw.length).toBe((stride + 1) * size)
  for (let y = 0; y < size; y++) expect(raw[y * (stride + 1)]).toBe(0)
}


describe("SSI brand/favicon production asset integrity", () => {
  it.each([
    ["favicon-96x96.png", 96],
    ["apple-touch-icon.png", 180],
    ["web-app-manifest-192x192.png", 192],
    ["web-app-manifest-512x512.png", 512],
  ] as const)("%s is a valid-size indexed PNG", (filename, size) => {
    const bytes = binary(filename)
    validatePng(bytes, size)
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
    validatePng(bytes.subarray(offset), 32)
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

  it("blocks restoration of the six pinned upstream favicon blobs", () => {
    const upstream = {
      "apple-touch-icon.png": "05145841d27a55cd7b0f3d3be5c3d4dd42f1c009",
      "favicon-96x96.png": "8a6755b0ec46326ea40d24490fb7a8f7ad7b95d3",
      "favicon.ico": "291e76ac10e9dc26e3a638110bd218d764e451dc",
      "favicon.svg": "6d1ab815be7b0205c93425fefd54d268bd8fcd04",
      "web-app-manifest-192x192.png": "20d0d48e933f7192b1deafe9a0bc61f5b0fad3e5",
      "web-app-manifest-512x512.png": "0f6138fe4c927d14e3827a8c8b0ecc3568b9e560",
    }
    for (const [name, upstreamSha] of Object.entries(upstream)) {
      const bytes = binary(name)
      const sha = createHash("sha1")
        .update(Buffer.from("blob " + bytes.length))
        .update(Buffer.from([0]))
        .update(bytes)
        .digest("hex")
      expect(sha, `${name} matches the upstream ChatbotX icon`).not.toBe(upstreamSha)
    }
  })

  it("preserves tenant favicon overrides without assuming their MIME type", () => {
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8")
    expect(layout).toContain("icons: faviconUrl")
    expect(layout).toContain("{ url: faviconUrl }")
    expect(layout).toContain("/brand/favicon/apple-touch-icon.png")
  })
})
