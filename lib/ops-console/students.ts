// Supabase-backed student roster helpers for the ops console.
//
// The ops console's Student shape is a lightweight subset of the real
// `students` table. We map here, defaulting fields the console can't
// resolve yet (progress, balance, lastLesson) so the UI keeps working.

import { supabase } from '@/lib/supabase'
import type { Student as OpsStudent } from '@/app/admin/ops-console/views'

type StudentRow = {
  id: string
  full_name: string
  training_stage: string | null
  status: string | null
}

function rowToOps(row: StudentRow): OpsStudent {
  return {
    id: row.id,
    name: row.full_name,
    phase: row.training_stage ?? '—',
    // Defaults for fields not yet sourced from the DB.
    progress: 0,
    balance: 0,
    lastLesson: '—',
    // `pending` keeps the existing ops console UI happy (it maps to the
    // warning badge). `completed`/`on_hold` render as active for now.
    status: row.status === 'pending' ? 'pending' : 'active',
  }
}

export async function listStudents(): Promise<OpsStudent[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, training_stage, status')
    .neq('status', 'inactive')
    .order('full_name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(rowToOps)
}

// Soft-delete: set status to 'inactive' so the record is preserved for
// historical bookings/invoices but drops off the active roster.
export async function softDeleteStudent(id: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ status: 'inactive' })
    .eq('id', id)
  if (error) throw error
}
