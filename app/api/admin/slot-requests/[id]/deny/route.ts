import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }
  return { user }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const denialReason = body.denial_reason ? String(body.denial_reason).trim() : ''

    if (!denialReason) {
      return NextResponse.json({ error: 'denial_reason is required' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Lookup request
    const { data: slotRequest, error: lookupError } = await supabaseAdmin
      .from('slot_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (lookupError || !slotRequest || slotRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request not found or already resolved.', code: 'ERR_REQ_004' },
        { status: 404 },
      )
    }

    // Update to denied
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('slot_requests')
      .update({
        status: 'denied',
        denial_reason: denialReason,
        resolved_by: adminCheck.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ request: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to deny slot request' },
      { status: 500 },
    )
  }
}
