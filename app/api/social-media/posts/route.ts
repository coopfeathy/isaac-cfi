import { NextRequest, NextResponse } from 'next/server'
import { fetchSocialMediaPosts } from '@/lib/social-media'

/**
 * GET /api/social-media/posts
 * 
 * Fetches social media posts from configured accounts
 * Supports caching and filtering by platform
 * 
 * Query parameters:
 * - platform: Filter by platform (instagram, tiktok, youtube, facebook)
 * - limit: Maximum number of posts to return (default: 12)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const limit = parseInt(searchParams.get('limit') || '12', 10)

    // Fetch posts from social media
    let posts = await fetchSocialMediaPosts()

    // Filter by platform if specified
    if (platform) {
      posts = posts.filter((post) => post.platform === platform)
    }

    // Limit results
    posts = posts.slice(0, limit)

    // Return with cache headers (cache for 1 hour)
    return NextResponse.json(posts, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Error fetching social media posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social media posts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/social-media/posts
 * 
 * Administrative endpoint to manually sync social media posts
 * Requires authentication in production
 */
export async function POST(request: NextRequest) {
  try {
    // In production, add authentication check here
    // const token = request.headers.get('Authorization')
    // if (!token || !isValidToken(token)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Fetch and update posts
    const posts = await fetchSocialMediaPosts()

    // In production, you would save these to a database
    // await supabaseAdmin.from('social_media_posts').upsert(posts)

    return NextResponse.json({
      success: true,
      message: 'Social media posts synced successfully',
      count: posts.length,
    })
  } catch (error) {
    console.error('Error syncing social media posts:', error)
    return NextResponse.json(
      { error: 'Failed to sync social media posts' },
      { status: 500 }
    )
  }
}
