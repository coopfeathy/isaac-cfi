// Supabase-backed schedule event helpers for the ops console.
//
// `schedule_events` is an internal-only table created specifically for the
// ops console schedule board. Each row is an aircraft + (optional) instructor +
// (optional) student + lesson label placed in a time window, with a status
// that covers both normal flights and non-flight states (maint/aog).
//
// The ops console UI stores times as half-hour tick indices starting at 07:00
// local. Conversion between tick indices and real timestamps happens at this
// boundary so the UI layer stays simple.

import { supabase } from '@/lib/supabase'

export const DAY_START_HOUR = 7
export const MINUTES_PER_TICK = 30
export const TICKS_PER_DAY = 24 // 12 hours × 2 ticks/hour (07:00–19:00)

export type ScheduleEventStatus =
  | 'booked'
  | 'in_flight'
  | 'completed'
  | 'pending'
  | 'maint'
  | 'aog'
  | 'canceled'

export type OpsScheduleEvent = {
  id: string
  // Human-friendly sequential code ("BK-1", "BK-2", ...) sourced from the
  // `booking_number` column. `id` remains the UUID used for DB mutations.
  code: string
  tail: string
  aircraftId: string
  start: number  // tick index
  end: number    // tick index
  startIso: string
  endIso: string
  student: string
  studentId: string | null
  cfi: string | null
  cfiId: string | null
  lesson: string
  status: ScheduleEventStatus
  paid: boolean | null
}

type Row = {
  id: string
  booking_number: number | null
  aircraft_id: string | null
  instructor_id: string | null
  student_id: string | null
  lesson: string | null
  student_label: string | null
  start_time: string
  end_time: string
  status: ScheduleEventStatus
  paid: boolean | null
  aircraft: { registration: string } | null
  students: { full_name: string } | null
  profiles: { full_name: string | null; first_name: string | null; last_name: string | null } | null
}

// Convert an ISO timestamp to a tick index relative to a given local-day start.
// Ticks before the day start clamp to 0; ticks after the last slot clamp to TICKS_PER_DAY.
export function isoToTick(iso: string, dayStart: Date): number {
  const t = new Date(iso).getTime()
  const base = dayStart.getTime() + DAY_START_HOUR * 60 * 60 * 1000
  const diffMin = (t - base) / 60_000
  return Math.max(0, Math.min(TICKS_PER_DAY, Math.round(diffMin / MINUTES_PER_TICK)))
}

// Convert a tick index on a given local day to an ISO timestamp.
export function tickToIso(tick: number, day: Date): string {
  const d = new Date(day)
  d.setHours(DAY_START_HOUR, 0, 0, 0)
  d.setMinutes(d.getMinutes() + tick * MINUTES_PER_TICK)
  return d.toISOString()
}

function pickCfiInitials(p: Row['profiles']): string | null {
  if (!p) return null
  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ')
  if (!name) return null
  return name.split(/\s+/).map(s => s[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('')
}

function rowToOps(row: Row, dayStart: Date): OpsScheduleEvent {
  const student = row.students?.full_name || row.student_label || '— MAINT'
  const cfiLabel = pickCfiInitials(row.profiles)
  return {
    id: row.id,
    code: row.booking_number != null ? `BK-${row.booking_number}` : `BK-${row.id.slice(0, 6)}`,
    tail: row.aircraft?.registration || '—',
    aircraftId: row.aircraft_id || '',
    start: isoToTick(row.start_time, dayStart),
    end: isoToTick(row.end_time, dayStart),
    startIso: row.start_time,
    endIso: row.end_time,
    student,
    studentId: row.student_id,
    cfi: cfiLabel, // kept as initials until we build a per-instructor palette
    cfiId: row.instructor_id,
    lesson: row.lesson || '—',
    status: row.status,
    paid: row.paid,
  }
}

// Get all events that overlap the local day `day`.
export async function listEventsForDay(day: Date): Promise<OpsScheduleEvent[]> {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const { data, error } = await supabase
    .from('schedule_events')
    .select(`
      id, booking_number, aircraft_id, instructor_id, student_id,
      lesson, student_label, start_time, end_time, status, paid,
      aircraft:aircraft_id ( registration ),
      students:student_id ( full_name ),
      profiles:instructor_id ( full_name, first_name, last_name )
    `)
    .gte('start_time', dayStart.toISOString())
    .lt('start_time', dayEnd.toISOString())
    .order('start_time', { ascending: true })
  if (error) throw error
  return ((data as unknown as Row[]) ?? []).map(r => rowToOps(r, dayStart))
}

export type CreateEventInput = {
  aircraftId: string
  instructorId?: string | null
  studentId?: string | null
  studentLabel?: string | null
  lesson?: string | null
  startIso: string
  endIso: string
  status?: ScheduleEventStatus
  paid?: boolean | null
}

export async function createScheduleEvent(input: CreateEventInput, day: Date): Promise<OpsScheduleEvent> {
  const { data, error } = await supabase
    .from('schedule_events')
    .insert({
      aircraft_id: input.aircraftId,
      instructor_id: input.instructorId ?? null,
      student_id: input.studentId ?? null,
      student_label: input.studentLabel ?? null,
      lesson: input.lesson ?? null,
      start_time: input.startIso,
      end_time: input.endIso,
      status: input.status ?? 'booked',
      paid: input.paid ?? null,
    })
    .select(`
      id, booking_number, aircraft_id, instructor_id, student_id,
      lesson, student_label, start_time, end_time, status, paid,
      aircraft:aircraft_id ( registration ),
      students:student_id ( full_name ),
      profiles:instructor_id ( full_name, first_name, last_name )
    `)
    .single()
  if (error) throw error
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  return rowToOps(data as unknown as Row, dayStart)
}

// Move an event to a different aircraft and/or shift its time.
export async function moveScheduleEvent(id: string, patch: { aircraftId?: string; startIso?: string; endIso?: string }): Promise<void> {
  const update: Record<string, unknown> = {}
  if (patch.aircraftId !== undefined) update.aircraft_id = patch.aircraftId
  if (patch.startIso !== undefined) update.start_time = patch.startIso
  if (patch.endIso !== undefined) update.end_time = patch.endIso
  if (Object.keys(update).length === 0) return
  const { error } = await supabase.from('schedule_events').update(update).eq('id', id)
  if (error) throw error
}

// Resize an event's start/end in-place.
export async function resizeScheduleEvent(id: string, startIso: string, endIso: string): Promise<void> {
  const { error } = await supabase
    .from('schedule_events')
    .update({ start_time: startIso, end_time: endIso })
    .eq('id', id)
  if (error) throw error
}

// Cancel (hard-delete) an event. Callers confirm via a modal first.
export async function deleteScheduleEvent(id: string): Promise<void> {
  const { error } = await supabase.from('schedule_events').delete().eq('id', id)
  if (error) throw error
}
