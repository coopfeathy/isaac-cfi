import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

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

  return { userId: user.id }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request)
    if (auth.error) return auth.error

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('slot_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load slot requests' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const requestId = String(body.requestId || '').trim()
    const action = String(body.action || '').trim()
    const decisionNotes = String(body.decisionNotes || '').trim()

    if (!requestId || (action !== 'approve' && action !== 'deny')) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: slotRequest, error: requestError } = await supabaseAdmin
      .from('slot_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !slotRequest) {
      return NextResponse.json({ error: 'Slot request not found' }, { status: 404 })
    }

    if (slotRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Slot request has already been reviewed' }, { status: 409 })
    }

    let approvedSlotId: string | null = null

    if (action === 'approve') {
      const price = Number.parseInt(String(body.price || '29900'), 10)
      const description = String(body.description || '').trim() || 'Discovery Flight'

      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
      }

      const { data: createdSlot, error: slotError } = await supabaseAdmin
        .from('slots')
        .insert([
          {
            start_time: slotRequest.preferred_start_time,
            end_time: slotRequest.preferred_end_time,
            type: 'tour',
            price,
            description,
            is_booked: false,
          },
        ])
        .select('id')
        .single()

      if (slotError || !createdSlot) {
        throw slotError || new Error('Failed to create slot')
      }

      approvedSlotId = createdSlot.id
    }

    const { error: updateError } = await supabaseAdmin
      .from('slot_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'denied',
        approved_slot_id: approvedSlotId,
        decision_notes: decisionNotes || null,
        resolved_by: auth.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, approvedSlotId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process slot request' }, { status: 500 })
  }
}
