import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  try {
    const { email, password, profile } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Create auth user with service role (bypasses normal auth restrictions)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData?.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 400 })
    }

    // Allowlist profile fields to prevent callers from setting arbitrary columns (e.g. is_admin)
    const allowedProfileFields = ['full_name', 'phone', 'avatar_url']
    const sanitizedProfile: Record<string, unknown> = {}
    for (const key of allowedProfileFields) {
      if (profile && key in profile && profile[key] !== undefined) {
        sanitizedProfile[key] = profile[key]
      }
    }

    // Prepare profile data - ensure no undefined values that might cause validation errors
    const profileData: Record<string, unknown> = {
      id: authData.user.id,
      ...sanitizedProfile,
    }

    // Create profile with admin bypass
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([profileData])

    if (profileError) {
      console.error('Profile error details:', profileError)
      return NextResponse.json({ 
        error: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      user: authData.user,
      profile: profileData
    })
  } catch (error: any) {
    console.error('[create-user] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
