import { getAllPosts } from '@/lib/posts'
import { MetadataRoute } from 'next'

export async function GET(): Promise<Response> {
  const posts = getAllPosts().filter(post => post.published)
  
  const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Merlin Flight Training Blog</title>
    <link>https://merlinflight.com/blog</link>
    <description>Flight training tips, aviation news, and flying guides</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>https://merlinflight.com/images/logo.png</url>
      <title>Merlin Flight Training</title>
      <link>https://merlinflight.com</link>
    </image>
    ${posts
      .map(
        (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>https://merlinflight.com/blog/${post.slug}</link>
      <guid>https://merlinflight.com/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt || post.title)}</description>
      <content:encoded><![CDATA[${post.content || ''}]]></content:encoded>
      <author>info@merlinflight.com</author>
      <category>Flight Training</category>
    </item>
    `
      )
      .join('')}
  </channel>
</rss>`

  return new Response(rssContent, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
    },
  })
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, function (c: string) {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
    }
    return c
  })
}
