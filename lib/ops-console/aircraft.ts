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
}

function rowToOps(row: AircraftRow): OpsAircraft & { id: string } {
  return {
    id: row.id,
    tail: row.registration,
    model: row.model,
    status: row.status ?? 'active',
    // Not yet wired: hobbs requires joining aircraft_hours, nextInsp isn't in DB.
    hobbs: 0,
    nextInsp: '—',
  }
}

export async function listAircraft(): Promise<Array<OpsAircraft & { id: string }>> {
  const { data, error } = await supabase
    .from('aircraft')
    .select('id, registration, model, status')
    .order('registration', { ascending: true })
  if (error) throw error
  return (data ?? []).map(rowToOps)
}

export async function createAircraft(input: { tail: string; model: string; status: string }): Promise<OpsAircraft & { id: string }> {
  const { data, error } = await supabase
    .from('aircraft')
    .insert({
      registration: input.tail,
      model: input.model,
      status: input.status,
    })
    .select('id, registration, model, status')
    .single()
  if (error) throw error
  return rowToOps(data as AircraftRow)
}

export async function deleteAircraft(id: string): Promise<void> {
  const { error } = await supabase.from('aircraft').delete().eq('id', id)
  if (error) throw error
}
