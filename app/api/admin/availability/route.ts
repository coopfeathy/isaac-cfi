import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { CreateAvailabilityInput, UpdateAvailabilityInput } from '@/lib/types/calendar'

function isValidTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t)
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('instructor_availability')
    .select('*')
    .order('day_of_week')
    .order('start_time')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: CreateAvailabilityInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { day_of_week, start_time, end_time } = body

  if (day_of_week === undefined || start_time === undefined || end_time === undefined) {
    return NextResponse.json({ error: 'day_of_week, start_time, and end_time are required' }, { status: 400 })
  }

  if (typeof day_of_week !== 'number' || !Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
    return NextResponse.json({ error: 'day_of_week must be an integer 0-6' }, { status: 400 })
  }

  if (!isValidTime(start_time) || !isValidTime(end_time)) {
    return NextResponse.json({ error: 'start_time and end_time must be in HH:MM format' }, { status: 400 })
  }

  if (start_time >= end_time) {
    return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 })
  }

  const db = getSupabaseAdmin()

  // Check for overlapping entries on the same day
  const { data: overlaps } = await db
    .from('instructor_availability')
    .select('id')
    .eq('day_of_week', day_of_week)
    .lt('start_time', end_time + ':00')
    .gt('end_time', start_time + ':00')

  if (overlaps && overlaps.length > 0) {
    return NextResponse.json(
      { error: 'Overlapping availability entry exists for this day', code: 'ERR_AVAIL_001' },
      { status: 409 },
    )
  }

  const { data, error } = await db
    .from('instructor_availability')
    .insert({ day_of_week, start_time: start_time + ':00', end_time: end_time + ':00', is_active: true })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: { id: string } & UpdateAvailabilityInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, is_active, start_time, end_time } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const hasTimeChange = start_time !== undefined || end_time !== undefined

  if (hasTimeChange) {
    // Fetch existing row to merge times for validation
    const { data: existing, error: fetchError } = await db
      .from('instructor_availability')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Availability entry not found' }, { status: 404 })
    }

    const effectiveStart = start_time ?? existing.start_time.substring(0, 5)
    const effectiveEnd = end_time ?? existing.end_time.substring(0, 5)

    if (!isValidTime(effectiveStart) || !isValidTime(effectiveEnd)) {
      return NextResponse.json({ error: 'start_time and end_time must be in HH:MM format' }, { status: 400 })
    }

    if (effectiveStart >= effectiveEnd) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 })
    }

    // Check for overlapping entries (exclude self)
    const { data: overlaps } = await db
      .from('instructor_availability')
      .select('id')
      .eq('day_of_week', existing.day_of_week)
      .neq('id', id)
      .lt('start_time', effectiveEnd + ':00')
      .gt('end_time', effectiveStart + ':00')

    if (overlaps && overlaps.length > 0) {
      return NextResponse.json(
        { error: 'Overlapping availability entry exists for this day', code: 'ERR_AVAIL_001' },
        { status: 409 },
      )
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (is_active !== undefined) updates.is_active = is_active
  if (start_time !== undefined) updates.start_time = start_time + ':00'
  if (end_time !== undefined) updates.end_time = end_time + ':00'

  const { data, error } = await db
    .from('instructor_availability')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: { id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('instructor_availability')
    .delete()
    .eq('id', body.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
