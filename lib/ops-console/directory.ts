// Lightweight directory helpers for the ops console: lists of instructors
// and students formatted for dropdowns.

import { supabase } from '@/lib/supabase'

export type DirectoryPerson = {
  id: string
  name: string
  // Short 1–2 char label for avatars.
  initials: string
}

function computeInitials(full: string): string {
  return full.split(/\s+/).map(s => s[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('')
}

// Instructors live in `profiles` with `is_instructor = true`.
export async function listInstructors(): Promise<DirectoryPerson[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, first_name, last_name, is_instructor')
    .eq('is_instructor', true)
  if (error) throw error
  return (data ?? [])
    .map(row => {
      const name = (row.full_name as string | null)
        || [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
      return { id: row.id as string, name: name || '—', initials: computeInitials(name || '') }
    })
    .filter(p => p.name && p.name !== '—')
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Active students, formatted for a dropdown.
export async function listActiveStudentsForDirectory(): Promise<DirectoryPerson[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, status')
    .neq('status', 'inactive')
    .order('full_name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(row => ({
    id: row.id as string,
    name: row.full_name as string,
    initials: computeInitials(row.full_name as string || ''),
  }))
}
