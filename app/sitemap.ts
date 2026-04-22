import { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/posts"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://merlinflighttraining.com"
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl,                                  lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${baseUrl}/discovery-flight`,            lastModified: now, changeFrequency: "weekly",  priority: 0.95 },
    { url: `${baseUrl}/discovery-flight-funnel`,     lastModified: now, changeFrequency: "weekly",  priority: 0.95 },
    { url: `${baseUrl}/start-training`,              lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/book-lesson`,                 lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${baseUrl}/pricing`,                     lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/schedule`,                    lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${baseUrl}/training-options`,            lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/aircraft`,                    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/instructors`,                 lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog`,                        lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${baseUrl}/foreign-students`,            lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/store`,                       lastModified: now, changeFrequency: "weekly",  priority: 0.75 },
    { url: `${baseUrl}/faq`,                         lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/careers`,                     lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/private-pilot-timeline`,      lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/apply`,                       lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/simulator/aatd-credit-details`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/support`,                     lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ]

  // Dynamic blog post routes
  let blogRoutes: MetadataRoute.Sitemap = []
  try {
    const posts = getAllPosts().filter(p => p.published)
    blogRoutes = posts.map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))
  } catch {
    // getAllPosts may fail at build time in some envs — safe to skip
  }

  return [...staticRoutes, ...blogRoutes]
}
