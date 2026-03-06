import { MetadataRoute } from "next"

// This would typically fetch from your database
// For now, we'll create a basic structure
export default async function blogSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://merlinflight.com"

  // In a real app, fetch from your CMS or database
  const blogPosts = [
    {
      url: `${baseUrl}/blog/2025-11-19-learn-to-fly-guide`,
      lastModified: new Date("2025-11-19"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ]

  return blogPosts
}
