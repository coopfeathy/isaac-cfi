import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function requireAdmin(request: NextRequest) {
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const body = await request.json().catch(() => ({}))
    const studentUserId = typeof body.studentUserId === 'string' ? body.studentUserId : ''
    const startTime = typeof body.startTime === 'string' ? body.startTime : ''
    const endTime = typeof body.endTime === 'string' ? body.endTime : ''
    const type = body.type === 'tour' ? 'tour' : 'training'
    const price = Number.parseInt(String(body.price ?? ''), 10)
    const description = typeof body.description === 'string' && body.description.trim().length > 0 ? body.description.trim() : null

    if (!studentUserId || !startTime || !endTime || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: studentUser, error: studentError } = await supabaseAdmin.auth.admin.getUserById(studentUserId)
    if (studentError || !studentUser.user) {
      return NextResponse.json({ error: 'Student account not found' }, { status: 404 })
    }

    const { data: overlappingSlots, error: overlapError } = await supabaseAdmin
      .from('slots')
      .select('id')
      .lt('start_time', endDate.toISOString())
      .gt('end_time', startDate.toISOString())

    if (overlapError) {
      return NextResponse.json({ error: overlapError.message }, { status: 500 })
    }

    if ((overlappingSlots || []).length > 0) {
      return NextResponse.json({ error: 'That time overlaps an existing slot' }, { status: 409 })
    }

    const { data: createdSlot, error: slotError } = await supabaseAdmin
      .from('slots')
      .insert([
        {
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          type,
          price,
          description,
          is_booked: true,
        },
      ])
      .select('id')
      .single()

    if (slotError || !createdSlot) {
      return NextResponse.json({ error: slotError?.message || 'Failed to create slot' }, { status: 500 })
    }

    const { data: createdBooking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([
        {
          slot_id: createdSlot.id,
          user_id: studentUserId,
          status: 'confirmed',
          notes: 'Created from admin flight planner',
        },
      ])
      .select('id')
      .single()

    if (bookingError || !createdBooking) {
      await supabaseAdmin.from('slots').delete().eq('id', createdSlot.id)
      return NextResponse.json({ error: bookingError?.message || 'Failed to create booking' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      slotId: createdSlot.id,
      bookingId: createdBooking.id,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
