// This file handles social media integration
// Currently set up for Instagram and TikTok embeds
// You can extend this to fetch from actual APIs

import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface SocialMediaPost {
  id: string
  platform: 'instagram' | 'tiktok' | 'youtube' | 'facebook'
  url: string
  title: string
  thumbnail?: string
  date: string
  type: 'video' | 'image' | 'carousel'
}

// Example: Get embed URL for Instagram post
export function getInstagramEmbedUrl(postUrl: string): string {
  return postUrl
}

// Example: Get embed URL for TikTok post
export function getTikTokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/video/${videoId}`
}

// Example: Get embed URL for YouTube video
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

// Example: Get embed URL for Facebook video
export function getFacebookEmbedUrl(videoUrl: string): string {
  return videoUrl
}

// This is a placeholder function for fetching social media posts
// In production, you would integrate with actual APIs for:
// - Instagram Graph API
// - TikTok API
// - YouTube Data API
// - Facebook Graph API

export async function fetchSocialMediaPosts(): Promise<SocialMediaPost[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return []
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('social_media_posts')
      .select('id, platform, url, title, thumbnail, date, type')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching social media posts:', error)
      return []
    }

    return (data || []) as SocialMediaPost[]
  } catch (error) {
    console.error('Error fetching social media posts:', error)
    return []
  }
}

// Helper to get platform icon
export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    instagram: '📷',
    tiktok: '🎵',
    youtube: '📹',
    facebook: 'f'
  }
  return icons[platform] || '📱'
}
