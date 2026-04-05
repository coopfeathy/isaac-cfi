import { metadata } from "../page"

describe("Store Page Metadata", () => {
  it("should export valid metadata with title", () => {
    expect(metadata).toBeDefined()
    expect(metadata.title).toBe(
      "Pilot Store | Merlin Flight Training - Starter Packages & Gear"
    )
  })

  it("should have SEO description", () => {
    expect(metadata.description).toContain("starter packages")
    expect(metadata.description).toContain("aviation gear")
  })

  it("should have openGraph metadata", () => {
    expect(metadata.openGraph).toBeDefined()
    const og = metadata.openGraph as Record<string, unknown>
    expect(og.title).toBe("Pilot Store | Merlin Flight Training")
    expect(og.url).toBe("https://merlinflight.com/store")
  })
})
