// NOTE: Requires 'blog-images' public bucket in Supabase Storage.
// Create via Supabase dashboard or: getSupabaseAdmin().storage.createBucket('blog-images', { public: true })

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  // Auth guard (D-09, SEC-10)
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // MIME type validation (D-10)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are accepted' },
        { status: 400 }
      )
    }

    // Size validation (D-11)
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage (D-12, D-13)
    const supabaseAdmin = getSupabaseAdmin()
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('blog-images')
      .upload(filename, buffer, {
        upsert: false,
        cacheControl: '3600',
        contentType: file.type,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data } = supabaseAdmin.storage
      .from('blog-images')
      .getPublicUrl(filename)

    return NextResponse.json({ success: true, url: data.publicUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
