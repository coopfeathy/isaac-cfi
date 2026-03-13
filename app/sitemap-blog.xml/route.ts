import { getAllPosts } from "@/lib/posts"

export async function GET(): Promise<Response> {
  const baseUrl = "https://merlinflight.com"
  const posts = getAllPosts().filter((post) => post.published)

  const urls = posts
    .map((post) => {
      const lastMod = post.date
        ? new Date(post.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]

      return `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
    })
    .join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate",
    },
  })
}
