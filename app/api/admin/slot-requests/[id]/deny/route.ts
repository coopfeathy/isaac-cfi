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
