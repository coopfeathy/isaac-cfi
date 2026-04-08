import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPostBySlug, getAllPosts } from '@/lib/posts'

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)

  if (!post || !post.published) {
    return {
      title: 'Post Not Found',
    }
  }

  const baseUrl = 'https://merlinflight.com'
  const postUrl = `${baseUrl}/blog/${post.slug}`

  return {
    title: `${post.title} | Merlin Flight Training Blog`,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      url: postUrl,
      type: 'article',
      authors: ['Isaac Prestwich – Merlin Flight Training'],
      publishedTime: post.date,
      siteName: 'Merlin Flight Training',
      images: [
        {
          url: '/images/merlin-og-image.jpg',
          width: 1200,
          height: 630,
          alt: `${post.title} – Merlin Flight Training`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || post.title,
      images: ['/images/merlin-og-image.jpg'],
      creator: '@merlinflight',
    },
    alternates: {
      canonical: postUrl,
    },
  }
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)

  if (!post || !post.published) {
    notFound()
  }

  const baseUrl = 'https://merlinflight.com'
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${baseUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${baseUrl}/blog/${post.slug}` },
    ],
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    author: { '@type': 'Person', name: 'Isaac Prestwich', url: baseUrl },
    publisher: {
      '@type': 'Organization',
      name: 'Merlin Flight Training',
      logo: { '@type': 'ImageObject', url: `${baseUrl}/merlin-logo.png` },
    },
    datePublished: post.date,
    url: `${baseUrl}/blog/${post.slug}`,
    image: `${baseUrl}/images/merlin-og-image.jpg`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <Link
          href="/blog"
          className="text-golden hover:text-opacity-80 mb-6 inline-block"
        >
          ← Back to Blog
        </Link>
        
        <h1 className="text-4xl font-bold text-darkText mb-4">{post.title}</h1>
        
        <p className="text-gray-500 mb-8">
          {new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />
      </article>
    </div>
    </>
  )
}
