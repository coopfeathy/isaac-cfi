import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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
