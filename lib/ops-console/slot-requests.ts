// Supabase-backed slot request helpers for the ops console.
//
// Slot requests are the "student asks for a time, admin approves/denies"
// queue. The ops console displays them with shorthand fields (lesson/alt/
// cfiPref/ageH) that the real table doesn't track; we stub those until the
// schema grows to match.

import { supabase } from '@/lib/supabase'

export type OpsSlotRequest = {
  id: string
  student: string
  lesson: string
  preferred: string
  alt: string
  cfiPref: string
  ageH: number
  status: 'pending' | 'approved' | 'denied'
  notes?: string | null
}

type SlotRequestRow = {
  id: string
  full_name: string
  preferred_start_time: string
  preferred_end_time: string
  notes: string | null
  status: string
  created_at: string
}

function formatStamp(iso: string): string {
  // "2026-04-23 14:00" — matches the ops console's existing shorthand.
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function rowToOps(row: SlotRequestRow): OpsSlotRequest {
  const ageMs = Date.now() - new Date(row.created_at).getTime()
  const ageH = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60)))
  const status = (row.status as OpsSlotRequest['status']) || 'pending'
  return {
    id: row.id,
    student: row.full_name,
    lesson: row.notes ?? '—',
    preferred: formatStamp(row.preferred_start_time),
    alt: '—',
    cfiPref: 'any',
    ageH,
    status,
    notes: row.notes,
  }
}

export async function listPendingSlotRequests(): Promise<OpsSlotRequest[]> {
  const { data, error } = await supabase
    .from('slot_requests')
    .select('id, full_name, preferred_start_time, preferred_end_time, notes, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToOps)
}

export async function approveSlotRequest(id: string, decisionNotes?: string): Promise<void> {
  const { error } = await supabase
    .from('slot_requests')
    .update({
      status: 'approved',
      decision_notes: decisionNotes ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function denySlotRequest(id: string, decisionNotes?: string): Promise<void> {
  const { error } = await supabase
    .from('slot_requests')
    .update({
      status: 'denied',
      decision_notes: decisionNotes ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}
