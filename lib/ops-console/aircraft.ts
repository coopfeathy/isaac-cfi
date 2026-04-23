// Supabase-backed aircraft CRUD for the ops console.
//
// The ops console's `Aircraft` shape historically used `tail / hobbs / nextInsp`,
// which predates the real schema. Here we translate between the two so the
// existing UI keeps working while the source of truth is Postgres.

import { supabase } from '@/lib/supabase'
import type { Aircraft as OpsAircraft } from '@/app/admin/ops-console/views'

type AircraftRow = {
  id: string
  registration: string
  model: string
  status: string | null
  hobbs: number | string | null
}

const SELECT_COLS = 'id, registration, model, status, hobbs'

function rowToOps(row: AircraftRow): OpsAircraft & { id: string } {
  return {
    id: row.id,
    tail: row.registration,
    model: row.model,
    status: row.status ?? 'active',
    // `hobbs` is numeric in Postgres; the JS driver surfaces it as string or
    // number depending on client version — coerce defensively.
    hobbs: Number(row.hobbs ?? 0),
    // Not yet wired: nextInsp isn't in DB.
    nextInsp: '—',
  }
}

export async function listAircraft(): Promise<Array<OpsAircraft & { id: string }>> {
  const { data, error } = await supabase
    .from('aircraft')
    .select(SELECT_COLS)
    .order('registration', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => rowToOps(r as AircraftRow))
}

export async function createAircraft(input: { tail: string; model: string; status: string; hobbs?: number }): Promise<OpsAircraft & { id: string }> {
  const { data, error } = await supabase
    .from('aircraft')
    .insert({
      registration: input.tail,
      model: input.model,
      status: input.status,
      hobbs: input.hobbs ?? 0,
    })
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return rowToOps(data as AircraftRow)
}

export async function deleteAircraft(id: string): Promise<void> {
  const { error } = await supabase.from('aircraft').delete().eq('id', id)
  if (error) throw error
}

// DB-backed columns: `registration`, `model`, `status`, `hobbs`.
// Next-inspection/home-base still live in-memory (no DB columns yet).
export async function updateAircraft(id: string, patch: { tail?: string; model?: string; status?: string; hobbs?: number }): Promise<OpsAircraft & { id: string }> {
  const row: Record<string, string | number> = {}
  if (patch.tail != null) row.registration = patch.tail
  if (patch.model != null) row.model = patch.model
  if (patch.status != null) row.status = patch.status
  if (patch.hobbs != null) row.hobbs = patch.hobbs
  const { data, error } = await supabase
    .from('aircraft')
    .update(row)
    .eq('id', id)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return rowToOps(data as AircraftRow)
}
