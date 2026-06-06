'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge, I } from '@/app/admin/ops-console/primitives'
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
    <div className="view-pad">
      <div className="skeleton">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sk-row">
            <div className="sk-bar" style={{ width: `${38 + i * 4}%` }} />
            <div className="sk-bar sk-thin" style={{ width: `${20 + i * 2}%` }} />
          </div>
        ))}
      </div>
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

        if (!res.ok) throw new Error(`Failed to load student roster (${res.status})`)

        const data = await res.json()
        if (!cancelled) setStudents(data)
      } catch {
        if (!cancelled) setError('Could not load student roster. Refresh the page to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStudents()
    return () => { cancelled = true }
  }, [session])

  const stats = useMemo(() => {
    const dual = students.reduce((sum, student) => sum + Number(student.dual_hours ?? 0), 0)
    const total = students.reduce((sum, student) => sum + Number(student.total_hours ?? 0), 0)
    const endorsements = students.reduce((sum, student) => sum + Number(student.endorsement_count ?? 0), 0)
    return { dual, total, endorsements }
  }, [students])

  if (loading) return <RosterSkeleton />

  return (
    <>
      <div className="cfi-toolbar">
        <div className="tb-date">
          <span className="mono dim">ROSTER</span>
          <span className="mono">{students.length} assigned</span>
        </div>
        <div className="tb-divider" />
        <div className="tb-group mono dim">active students only</div>
        <div className="tb-spacer" />
        <Link href="/cfi/log" className="btn-primary"><I name="plus" /> Log Training</Link>
      </div>

      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">STUDENTS</div><div className="stat-v">{students.length}</div><div className="stat-delta dim">assigned</div></div>
          <div className="stat"><div className="stat-k mono">DUAL HOURS</div><div className="stat-v">{stats.dual.toFixed(1)}</div><div className="stat-delta pos">logged with you</div></div>
          <div className="stat"><div className="stat-k mono">TOTAL HOURS</div><div className="stat-v">{stats.total.toFixed(1)}</div><div className="stat-delta dim">student totals</div></div>
          <div className="stat"><div className="stat-k mono">ENDORSEMENTS</div><div className="stat-v">{stats.endorsements}</div><div className="stat-delta warn">review currency</div></div>
        </div>

        <div className="sect-head">
          <h3>Assigned students</h3>
          <span className="mono dim">training state · hours · endorsements</span>
        </div>

        {error ? (
          <div className="cfi-muted-panel neg">{error}</div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-ico"><I name="users" size={22} /></div>
            <div className="empty-title">No students assigned</div>
            <div className="empty-sub mono dim">Students appear here once an admin assigns you as their instructor.</div>
          </div>
        ) : (
          <div className="cfi-card-grid">
            {students.map((student) => (
              <div key={student.id} className="cfi-card">
                <div className="cfi-card-head">
                  <div>
                    <div className="cfi-card-title">{student.full_name}</div>
                    <div className="cfi-card-sub mono">{student.email}</div>
                  </div>
                  <Badge kind={student.endorsement_count > 0 ? 'ok' : 'muted'}>
                    {student.endorsement_count} END
                  </Badge>
                </div>
                <div className="cfi-metric-row">
                  <div className="cfi-mini-stat"><span>Dual</span><strong>{formatHours(student.dual_hours)}</strong></div>
                  <div className="cfi-mini-stat"><span>Total</span><strong>{formatHours(student.total_hours)}</strong></div>
                  <div className="cfi-mini-stat"><span>ID</span><strong className="mono">{student.user_id.slice(0, 4)}</strong></div>
                </div>
                <div className="dc-actions">
                  <Link className="btn-ghost" href="/cfi/log">Log hours</Link>
                  <Link className="btn-primary" href="/cfi/log"><I name="check" /> Endorse</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
