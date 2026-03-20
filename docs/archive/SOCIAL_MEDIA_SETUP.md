# Social Media Integration Setup Guide

This guide explains how to set up automatic social media post synchronization for the Merlin Flight Training website.

## Overview

The website now has a dedicated **Blog & Videos** section that can display posts from your social media accounts (Instagram, TikTok, YouTube, Facebook). Videos will automatically update as you post new content on those platforms.

## Current Setup

Your social media accounts are already linked in the footer:
- **Instagram**: @merlinflighttraining
- **TikTok**: @isaacthecfi
- **YouTube**: @MerlinFlightTraining
- **Facebook**: Merlin Flight Training

## Implementation Options

### Option 1: Manual Post Management (Simplest)

Store social media post metadata in a database table and manually add entries as you post new content.

**Setup Steps:**
1. Create a `social_media_posts` table in Supabase with fields:
   - `id` (UUID)
   - `platform` (text: instagram, tiktok, youtube, facebook)
   - `url` (text: full post/video URL)
   - `title` (text: video title)
   - `thumbnail` (text: thumbnail image URL)
   - `date` (timestamp)
   - `type` (text: video, image, carousel)
   - `created_at` (timestamp)

2. Update `lib/social-media.ts` `fetchSocialMediaPosts()` function:
```typescript
export async function fetchSocialMediaPosts(): Promise<SocialMediaPost[]> {
  try {
    const { data } = await supabaseAdmin
      .from('social_media_posts')
      .select('*')
      .order('date', { ascending: false })
    return data || []
  } catch (error) {
    console.error('Error fetching social media posts:', error)
    return []
  }
}
```

### Option 2: Instagram Graph API Integration

Automatically fetch Instagram posts using Meta's Graph API.

**Setup Steps:**

1. **Create a Meta App:**
   - Go to https://developers.facebook.com/
   - Click "My Apps" → "Create App"
   - Choose "Business" as app type
   - Select "Other"

2. **Get Your Credentials:**
   - App ID and App Secret from Settings → Basic
   - Create an Instagram Business Account (if not already)

3. **Generate Access Token:**
   - Go to https://developers.facebook.com/tools/explorer/
   - Select your app
   - Go to Permissions tab
   - Request: `instagram_business_content_publish`, `instagram_basic`
   - Generate access token

4. **Update Environment Variables:**
```env
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id
INSTAGRAM_ACCESS_TOKEN=your_access_token
```

5. **Update `lib/social-media.ts`:**
```typescript
export async function fetchInstagramPosts(): Promise<SocialMediaPost[]> {
  try {
    const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN

    const response = await fetch(
      `https://graph.instagram.com/${accountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&access_token=${accessToken}`
    )

    const data = await response.json()

    if (!data.data) return []

    return data.data
      .filter((item: any) => item.media_type === 'VIDEO' || item.media_type === 'IMAGE')
      .map((item: any) => ({
        id: item.id,
        platform: 'instagram' as const,
        url: item.permalink,
        title: item.caption || 'Instagram Post',
        thumbnail: item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url,
        date: item.timestamp,
        type: item.media_type === 'VIDEO' ? 'video' : 'image',
      }))
  } catch (error) {
    console.error('Error fetching Instagram posts:', error)
    return []
  }
}
```

### Option 3: YouTube Data API Integration

Automatically fetch videos from your YouTube channel.

**Setup Steps:**

1. **Enable YouTube Data API:**
   - Go to https://console.cloud.google.com/
   - Create new project
   - Search "YouTube Data API v3"
   - Click "Enable"

2. **Create API Key:**
   - Go to Credentials
   - Click "Create Credentials" → "API Key"
   - Copy the key

3. **Get Your Channel ID:**
   - Go to your YouTube channel
   - Click "Settings"
   - Find "Advanced Settings"
   - Copy your Channel ID

4. **Update Environment Variables:**
```env
YOUTUBE_API_KEY=your_api_key
YOUTUBE_CHANNEL_ID=your_channel_id
```

5. **Update `lib/social-media.ts`:**
```typescript
export async function fetchYouTubeVideos(): Promise<SocialMediaPost[]> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    const channelId = process.env.YOUTUBE_CHANNEL_ID

    // Get uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
    )
    const channelData = await channelResponse.json()
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // Get videos from uploads playlist
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=12&key=${apiKey}`
    )
    const videosData = await videosResponse.json()

    return videosData.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      platform: 'youtube' as const,
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      date: item.snippet.publishedAt,
      type: 'video' as const,
    }))
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    return []
  }
}
```

### Option 4: TikTok API Integration

Note: TikTok API is more restrictive. Consider using embed URLs instead.

**Alternative - Direct Embed Approach:**
```typescript
// Users can manually add TikTok videos via Database
// Just store the video ID and generate embed URL
export function getTikTokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/video/${videoId}`
}
```

## Automatic Updates Setup

### Option A: Scheduled Sync (Recommended)

Use a cron job to automatically sync posts periodically.

**Using Netlify Functions (if hosting on Netlify):**

1. Create `netlify/functions/sync-social-media.ts`:
```typescript
import { fetchSocialMediaPosts } from '../../lib/social-media'

export default async (req: Request) => {
  // Verify request is from Netlify scheduler
  const token = new URL(req.url).searchParams.get('token')
  if (token !== process.env.NETLIFY_CRON_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const posts = await fetchSocialMediaPosts()
    // Save to database if needed
    return new Response(JSON.stringify({ success: true, count: posts.length }))
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
```

2. Add to `netlify.toml`:
```toml
[[functions]]
path = "netlify/functions/sync-social-media.ts"

[[scheduled]]
function = "sync-social-media"
cron = "0 */6 * * *"  # Every 6 hours
```

### Option B: Webhook Approach

Set up webhooks from social media platforms to notify your site when new content is posted.

## Testing

After setup, test the API endpoint:

```bash
# Test the social media posts endpoint
curl "https://yourdomain.com/api/social-media/posts"

# Filter by platform
curl "https://yourdomain.com/api/social-media/posts?platform=youtube"

# Limit results
curl "https://yourdomain.com/api/social-media/posts?limit=6"
```

## Troubleshooting

### Posts Not Showing
1. Check browser console for errors
2. Verify API keys and credentials in `.env.local`
3. Check if social media accounts are public
4. Review API rate limits

### Old Posts Not Updating
1. Verify cron job is running (check in hosting provider dashboard)
2. Check error logs in API endpoint
3. Confirm API credentials are still valid

## Environment Variables Template

```env
# Instagram
INSTAGRAM_BUSINESS_ACCOUNT_ID=
INSTAGRAM_ACCESS_TOKEN=

# YouTube
YOUTUBE_API_KEY=
YOUTUBE_CHANNEL_ID=

# Netlify Cron
NETLIFY_CRON_TOKEN=your_random_token_here
```

## Support Links

- [Meta Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [TikTok API Documentation](https://developers.tiktok.com/)
- [Netlify Scheduled Functions](https://docs.netlify.com/functions/overview/?fn-language=ts)

## Next Steps

1. Choose your preferred integration method (YouTube is recommended for easy setup)
2. Set up the necessary API credentials
3. Update `lib/social-media.ts` with your integration
4. Test the endpoint
5. Set up automatic syncing if desired
6. Deploy to production
