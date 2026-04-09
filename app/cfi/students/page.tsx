'use client'

import { useEffect, useState } from 'react'
import CFIPageShell from '@/app/components/CFIPageShell'
import { useAuth } from '@/app/contexts/AuthContext'

type Student = {
  id: string
  user_id: string
  full_name: string
  email: string
  dual_hours: number | null
  total_hours: number | null
  created_at: string
  endorsement_count: number
}

function formatHours(hours: number | null | undefined): string {
  if (hours == null || isNaN(Number(hours))) return '0.0'
  return Number(hours).toFixed(1)
}

function RosterSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  )
}

export default function CFIStudentsPage() {
  const { session } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStudents() {
      try {
        setLoading(true)
        setError(null)

        const token = session?.access_token
        const res = await fetch('/api/cfi/students', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (!res.ok) {
          throw new Error(`Failed to load student roster (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setStudents(data)
        }
      } catch {
        if (!cancelled) {
          setError('Could not load your student roster. Refresh the page to try again.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchStudents()

    return () => {
      cancelled = true
    }
  }, [session])

  return (
    <CFIPageShell title="My Students">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <RosterSkeleton />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : students.length === 0 ? (
          <div role="status" aria-live="polite" className="py-12 text-center">
            <h3 className="text-lg font-semibold text-darkText">No students yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Students will appear here once an admin assigns you as their instructor.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" aria-busy="false">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th
                    scope="col"
                    className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="w-[100px] pb-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    Dual Hours
                  </th>
                  <th
                    scope="col"
                    className="w-[100px] pb-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    Total Hours
                  </th>
                  <th
                    scope="col"
                    className="w-[120px] pb-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    Endorsements
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-[#FFFDF7]">
                    <td className="py-3 font-medium text-darkText">{student.full_name}</td>
                    <td className="py-3 text-slate-600">{student.email}</td>
                    <td className="py-3 text-slate-700">{formatHours(student.dual_hours)}</td>
                    <td className="py-3 text-slate-700">{formatHours(student.total_hours)}</td>
                    <td className="py-3 text-slate-700">{student.endorsement_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CFIPageShell>
  )
}
