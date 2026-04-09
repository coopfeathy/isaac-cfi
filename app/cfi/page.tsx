'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import CFIPageShell from '@/app/components/CFIPageShell'
import { useAuth } from '@/app/contexts/AuthContext'

type ScheduleEntry = {
  id: string
  status: 'pending' | 'confirmed' | 'completed'
  notes: string | null
  user_id: string
  created_at: string
  student_name: string
  slots: {
    start_time: string
    end_time: string
    type: string
  } | null
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
}

function StatusBadge({ status }: { status: ScheduleEntry['status'] }) {
  const classes: Record<ScheduleEntry['status'], string> = {
    pending: 'bg-slate-100 text-slate-700 border border-slate-300',
    confirmed: 'bg-[#FFF3C9] text-[#7A5C00] border border-[#D7B24A]',
    completed: 'bg-white text-slate-500 border border-slate-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  )
}

export default function CFISchedulePage() {
  const { session } = useAuth()
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchSchedule() {
      try {
        setLoading(true)
        setError(null)

        const token = session?.access_token
        const res = await fetch('/api/cfi/schedule', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (!res.ok) {
          throw new Error(`Failed to load schedule (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setSchedule(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Could not load your schedule. Refresh the page to try again.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchSchedule()

    return () => {
      cancelled = true
    }
  }, [session])

  const actions = (
    <>
      <Link
        href="/cfi/log"
        className="inline-flex items-center rounded-xl bg-golden px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFE79A]"
      >
        Log Hours
      </Link>
      <Link
        href="/cfi/log"
        className="inline-flex items-center rounded-xl bg-golden px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFE79A]"
      >
        Log Endorsement
      </Link>
    </>
  )

  return (
    <CFIPageShell title="Your Schedule" actions={actions}>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <ScheduleSkeleton />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : schedule.length === 0 ? (
          <div role="status" aria-live="polite" className="py-12 text-center">
            <h3 className="text-lg font-semibold text-darkText">No lessons scheduled</h3>
            <p className="mt-2 text-sm text-slate-500">
              You have no confirmed or pending lessons in the next 7 days.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Date / Time
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Student
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Type
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedule.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="py-3 text-slate-700">
                      {entry.slots?.start_time
                        ? formatDateTime(entry.slots.start_time)
                        : '—'}
                    </td>
                    <td className="py-3 font-medium text-darkText">{entry.student_name}</td>
                    <td className="py-3 capitalize text-slate-600">
                      {entry.slots?.type ?? '—'}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={entry.status} />
                    </td>
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
