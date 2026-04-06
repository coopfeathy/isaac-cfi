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
    const decisionNotes = body.decision_notes ? String(body.decision_notes).trim() : null

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

    // Conflict check: another approved request overlapping this time
    const { data: conflicts } = await supabaseAdmin
      .from('slot_requests')
      .select('id')
      .eq('status', 'approved')
      .neq('id', id)
      .lt('preferred_start_time', slotRequest.preferred_end_time)
      .gt('preferred_end_time', slotRequest.preferred_start_time)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Cannot approve — this time slot conflicts with another booking.', code: 'ERR_REQ_003' },
        { status: 409 },
      )
    }

    // Update to approved
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('slot_requests')
      .update({
        status: 'approved',
        resolved_by: adminCheck.user.id,
        resolved_at: new Date().toISOString(),
        decision_notes: decisionNotes,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ request: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to approve slot request' },
      { status: 500 },
    )
  }
}
