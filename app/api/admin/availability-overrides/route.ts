import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { CreateOverrideInput } from '@/lib/types/calendar'

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

function isValidDate(d: string): boolean {
  if (!DATE_RE.test(d)) return false
  const parsed = new Date(d + 'T00:00:00')
  return !isNaN(parsed.getTime())
}

function getTodayET(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

function isFutureDate(d: string): boolean {
  return d >= getTodayET()
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const db = getSupabaseAdmin()
  let query = db
    .from('availability_overrides')
    .select('*')

  if (from) {
    query = query.gte('override_date', from)
  } else {
    query = query.gte('override_date', getTodayET())
  }

  if (to) {
    query = query.lte('override_date', to)
  }

  query = query.order('override_date', { ascending: true })

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: CreateOverrideInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { override_date, is_available, start_time, end_time, reason } = body

  if (!override_date || is_available === undefined) {
    return NextResponse.json({ error: 'override_date and is_available are required' }, { status: 400 })
  }

  if (!isValidDate(override_date)) {
    return NextResponse.json({ error: 'override_date must be in YYYY-MM-DD format' }, { status: 400 })
  }

  if (!isFutureDate(override_date)) {
    return NextResponse.json(
      { error: 'override_date must be today or in the future', code: 'ERR_AVAIL_003' },
      { status: 400 },
    )
  }

  if (is_available) {
    if (!start_time || !end_time) {
      return NextResponse.json(
        { error: 'start_time and end_time are required when is_available is true' },
        { status: 400 },
      )
    }
    if (!TIME_RE.test(start_time) || !TIME_RE.test(end_time)) {
      return NextResponse.json({ error: 'start_time and end_time must be in HH:MM format' }, { status: 400 })
    }
    if (start_time >= end_time) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 })
    }
  }

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('availability_overrides')
    .insert({
      override_date,
      is_available,
      start_time: is_available ? start_time : null,
      end_time: is_available ? end_time : null,
      reason: reason ?? null,
    })
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

  let body: { id: string } & Partial<CreateOverrideInput>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, override_date, is_available, start_time, end_time, reason } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()

  // Fetch existing row
  const { data: existing, error: fetchError } = await db
    .from('availability_overrides')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Override not found' }, { status: 404 })
  }

  // Validate override_date if changed
  const effectiveDate = override_date ?? existing.override_date
  if (override_date !== undefined) {
    if (!isValidDate(override_date)) {
      return NextResponse.json({ error: 'override_date must be in YYYY-MM-DD format' }, { status: 400 })
    }
    if (!isFutureDate(override_date)) {
      return NextResponse.json(
        { error: 'override_date must be today or in the future', code: 'ERR_AVAIL_003' },
        { status: 400 },
      )
    }
  }

  // Determine effective is_available and times after merge
  const effectiveIsAvailable = is_available ?? existing.is_available
  const effectiveStart = start_time ?? existing.start_time
  const effectiveEnd = end_time ?? existing.end_time

  if (effectiveIsAvailable) {
    if (!effectiveStart || !effectiveEnd) {
      return NextResponse.json(
        { error: 'start_time and end_time are required when is_available is true' },
        { status: 400 },
      )
    }
    if (effectiveStart >= effectiveEnd) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 })
    }
  }

  // Build update payload
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (override_date !== undefined) updates.override_date = override_date
  if (is_available !== undefined) {
    updates.is_available = is_available
    // When switching to unavailable, clear times
    if (!is_available) {
      updates.start_time = null
      updates.end_time = null
    }
  }
  if (start_time !== undefined) updates.start_time = start_time
  if (end_time !== undefined) updates.end_time = end_time
  if (reason !== undefined) updates.reason = reason

  const { data, error } = await db
    .from('availability_overrides')
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
    .from('availability_overrides')
    .delete()
    .eq('id', body.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
