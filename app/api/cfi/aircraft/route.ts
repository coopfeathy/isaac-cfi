import { NextRequest, NextResponse } from 'next/server'
import { requireCFI } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type AircraftRow = {
  id: string
  registration: string
  model: string
  status: string | null
}

type SlotRow = {
  id: string
  start_time: string
  end_time: string
  type: string | null
  instructor_id: string | null
  aircraft_id: string | null
  notes: string | null
}

type BookingRow = {
  id: string
  slot_id: string
  user_id: string
  status: string
  notes: string | null
}

type MaintenanceRow = {
  id: string
  aircraft_id: string
  start_time: string
  end_time: string
  type: 'maintenance' | 'squawk'
  notes: string | null
}

export async function GET(request: NextRequest) {
  const authCheck = await requireCFI(request)
  if ('error' in authCheck) return authCheck.error

  const db = getSupabaseAdmin()

  // Pull fleet
  const { data: aircraftRaw, error: acErr } = await db
    .from('aircraft')
    .select('id, registration, model, status')
    .order('registration', { ascending: true })

  if (acErr) {
    return NextResponse.json({ error: acErr.message }, { status: 500 })
  }

  const aircraft = ((aircraftRaw ?? []) as AircraftRow[]).map((a) => ({
    id: a.id,
    tail_number: a.registration,
    model: a.model,
    status: (a.status === 'maintenance' || a.status === 'grounded' ? a.status : 'airworthy') as
      | 'airworthy'
      | 'grounded'
      | 'maintenance',
  }))

  // Date window: this week and next
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  today.setUTCDate(today.getUTCDate() - today.getUTCDay())
  const fourteenDays = new Date(today)
  fourteenDays.setUTCDate(fourteenDays.getUTCDate() + 14)

  const { data: slots } = await db
    .from('slots')
    .select('id, start_time, end_time, type, instructor_id, aircraft_id, notes')
    .gte('start_time', today.toISOString())
    .lte('start_time', fourteenDays.toISOString())
    .not('aircraft_id', 'is', null)

  const slotIds = ((slots ?? []) as SlotRow[]).map((s) => s.id)
  let bookings: BookingRow[] = []
  if (slotIds.length > 0) {
    const { data } = await db
      .from('bookings')
      .select('id, slot_id, user_id, status, notes')
      .in('slot_id', slotIds)
      .in('status', ['pending', 'confirmed'])
    bookings = (data ?? []) as BookingRow[]
  }

  const cfiIds = Array.from(new Set(((slots ?? []) as SlotRow[]).map((s) => s.instructor_id).filter(Boolean) as string[]))
  const studentIds = Array.from(new Set(bookings.map((b) => b.user_id)))

  const { data: cfiProfiles } = await db
    .from('profiles')
    .select('id, full_name, email')
    .in('id', cfiIds.length > 0 ? cfiIds : ['00000000-0000-0000-0000-000000000000'])

  const cfiMap = new Map<string, string>()
  for (const p of (cfiProfiles ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
    cfiMap.set(p.id, p.full_name || p.email || 'Instructor')
  }

  const { data: studentRows } = await db
    .from('students')
    .select('user_id, full_name')
    .in('user_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])

  const studentMap = new Map<string, string>()
  for (const s of (studentRows ?? []) as Array<{ user_id: string; full_name: string }>) {
    studentMap.set(s.user_id, s.full_name)
  }

  const bookingsBySlot = new Map<string, BookingRow>()
  for (const b of bookings) bookingsBySlot.set(b.slot_id, b)

  const blocks: Array<Record<string, unknown>> = []

  const aircraftLookup = new Map<string, AircraftRow>()
  for (const a of (aircraftRaw ?? []) as AircraftRow[]) aircraftLookup.set(a.id, a)

  for (const s of ((slots ?? []) as SlotRow[])) {
    if (!s.aircraft_id) continue
    const booking = bookingsBySlot.get(s.id)
    if (!booking) continue
    const ac = aircraftLookup.get(s.aircraft_id)
    blocks.push({
      id: booking.id,
      aircraft_id: s.aircraft_id,
      tail_number: ac?.registration ?? '',
      model: ac?.model ?? '',
      block_type: 'booking',
      start_time: s.start_time,
      end_time: s.end_time,
      cfi_id: s.instructor_id,
      cfi_name: s.instructor_id ? cfiMap.get(s.instructor_id) ?? 'Instructor' : null,
      student_name: studentMap.get(booking.user_id) ?? null,
      notes: booking.notes ?? s.notes,
      status: booking.status,
    })
  }

  // Optional aircraft_maintenance table: if it doesn't exist the query will error silently;
  // we wrap so missing-table doesn't 500 the route.
  try {
    const { data: maint } = await db
      .from('aircraft_maintenance')
      .select('id, aircraft_id, start_time, end_time, type, notes')
      .gte('start_time', today.toISOString())
      .lte('start_time', fourteenDays.toISOString())
    for (const m of (maint ?? []) as MaintenanceRow[]) {
      const ac = aircraftLookup.get(m.aircraft_id)
      blocks.push({
        id: m.id,
        aircraft_id: m.aircraft_id,
        tail_number: ac?.registration ?? '',
        model: ac?.model ?? '',
        block_type: m.type === 'squawk' ? 'squawk' : 'maintenance',
        start_time: m.start_time,
        end_time: m.end_time,
        cfi_id: null,
        cfi_name: null,
        student_name: null,
        notes: m.notes,
      })
    }
  } catch {
    // table not present yet — fine
  }

  return NextResponse.json({ aircraft, blocks })
}
