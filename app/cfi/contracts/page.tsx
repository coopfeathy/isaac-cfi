'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, I } from '@/app/admin/ops-console/primitives'
import { useAuth } from '@/app/contexts/AuthContext'

type ContractTemplate = {
  id: string
  name: string
  description: string
  badge: string
}

type SentContract = {
  id: string
  recipient_name: string
  recipient_email: string
  template_id: string
  template_name: string
  status: 'sent' | 'viewed' | 'signed'
  sent_at: string
  signed_at: string | null
}

const TEMPLATES: ContractTemplate[] = [
  {
    id: 'new_student_onboarding',
    name: 'New Student Onboarding',
    description: 'Welcome packet, training agreement, payment terms, and cancellation policy. The default for first-day students.',
    badge: 'RECOMMENDED',
  },
  {
    id: 'training_agreement',
    name: 'Training Agreement Only',
    description: 'Liability waiver, syllabus expectations, and FAA training records consent — no payment terms.',
    badge: 'CORE',
  },
  {
    id: 'rental_agreement',
    name: 'Aircraft Rental Agreement',
    description: 'For students cleared to solo or rental customers — insurance, fuel responsibility, return condition.',
    badge: 'RENTAL',
  },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusKind(status: SentContract['status']) {
  if (status === 'signed') return 'ok'
  if (status === 'viewed') return 'warn'
  return 'muted'
}

export default function CFIContractsPage() {
  const { session } = useAuth()
  const [contracts, setContracts] = useState<SentContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  // Form state
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const [personalNote, setPersonalNote] = useState('')
  const [sending, setSending] = useState(false)

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = session?.access_token
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }, [session])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/cfi/contracts', { headers: getAuthHeaders() })
        if (res.ok) {
          const data = (await res.json()) as { contracts: SentContract[] }
          if (!cancelled) setContracts(data.contracts ?? [])
        }
      } catch {
        if (!cancelled) setError('Could not load contracts. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [getAuthHeaders])

  const stats = useMemo(() => {
    return {
      sent: contracts.filter((c) => c.status === 'sent').length,
      viewed: contracts.filter((c) => c.status === 'viewed').length,
      signed: contracts.filter((c) => c.status === 'signed').length,
      total: contracts.length,
    }
  }, [contracts])

  const selectedTemplate = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]

  async function handleSend() {
    if (!recipientEmail || !recipientName) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/cfi/contracts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          template_id: templateId,
          template_name: selectedTemplate.name,
          personal_note: personalNote,
        }),
      })
      if (!res.ok) throw new Error('send')
      const data = (await res.json()) as { contract: SentContract }
      setContracts((prev) => [data.contract, ...prev])
      setFlash(`Contract sent to ${recipientEmail}.`)
      setRecipientName('')
      setRecipientEmail('')
      setPersonalNote('')
      window.setTimeout(() => setFlash(null), 4000)
    } catch {
      setError('Could not send contract. Try again.')
    } finally {
      setSending(false)
    }
  }

  async function resend(c: SentContract) {
    try {
      const res = await fetch('/api/cfi/contracts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recipient_name: c.recipient_name,
          recipient_email: c.recipient_email,
          template_id: c.template_id,
          template_name: c.template_name,
          personal_note: '',
        }),
      })
      if (!res.ok) throw new Error('resend')
      setFlash(`Contract resent to ${c.recipient_email}.`)
      window.setTimeout(() => setFlash(null), 4000)
    } catch {
      setError('Could not resend contract.')
    }
  }

  return (
    <>
      <div className="cfi-toolbar">
        <div className="tb-date">
          <span className="mono dim">CONTRACTS</span>
          <span className="mono">{contracts.length} sent</span>
        </div>
        <div className="tb-divider" />
        <div className="tb-group mono dim">onboarding · training agreements · rentals</div>
        <div className="tb-spacer" />
      </div>

      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">SENT</div><div className="stat-v">{stats.sent}</div><div className="stat-delta dim">awaiting view</div></div>
          <div className="stat"><div className="stat-k mono">VIEWED</div><div className="stat-v">{stats.viewed}</div><div className={stats.viewed ? 'stat-delta warn' : 'stat-delta dim'}>not yet signed</div></div>
          <div className="stat"><div className="stat-k mono">SIGNED</div><div className="stat-v">{stats.signed}</div><div className="stat-delta pos">complete</div></div>
          <div className="stat"><div className="stat-k mono">TOTAL</div><div className="stat-v">{stats.total}</div><div className="stat-delta dim">all-time</div></div>
        </div>

        {flash && <div className="cfi-flash-ok">{flash}</div>}
        {error && <div className="cfi-muted-panel neg" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="sect-head">
          <h3>Send a contract</h3>
          <span className="mono dim">name + email + one button — that&apos;s it</span>
        </div>

        <div className="cfi-contract-form">
          <div className="cfi-contract-grid">
            <label className="cfi-field">
              <span className="cfi-field-label mono dim">STUDENT NAME</span>
              <input
                type="text"
                className="cfi-form-input"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Jane Doe"
              />
            </label>
            <label className="cfi-field">
              <span className="cfi-field-label mono dim">EMAIL</span>
              <input
                type="email"
                className="cfi-form-input"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </label>
            <label className="cfi-field cfi-field-wide">
              <span className="cfi-field-label mono dim">PERSONAL NOTE (OPTIONAL)</span>
              <textarea
                className="cfi-form-textarea"
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Great meeting you today — sign this when you have a few minutes and we'll be all set for next week."
              />
            </label>
          </div>

          <div className="sect-head" style={{ marginTop: 6, marginBottom: 6 }}>
            <h4 style={{ margin: 0, fontSize: 13 }}>Pick a template</h4>
            <span className="mono dim">most CFIs send the recommended one</span>
          </div>

          <div className="cfi-template-grid">
            {TEMPLATES.map((t) => {
              const selected = t.id === templateId
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`cfi-template-card ${selected ? 'sel' : ''}`}
                  onClick={() => setTemplateId(t.id)}
                >
                  <div className="cfi-template-head">
                    <span className="cfi-template-name">{t.name}</span>
                    <Badge kind={selected ? 'ok' : 'muted'}>{t.badge}</Badge>
                  </div>
                  <p className="cfi-template-desc">{t.description}</p>
                </button>
              )
            })}
          </div>

          <div className="cfi-bill-actions">
            <button
              className="btn-primary"
              onClick={handleSend}
              disabled={sending || !recipientEmail || !recipientName}
            >
              <I name="check" /> {sending ? 'Sending...' : `Send ${selectedTemplate.name}`}
            </button>
            <span className="mono dim">→ {recipientEmail || 'student email'}</span>
          </div>
        </div>

        <div className="sect-head" style={{ marginTop: 24 }}>
          <h3>Sent contracts</h3>
          <span className="mono dim">last 50</span>
        </div>

        {loading ? (
          <div className="skeleton">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="sk-row">
                <div className="sk-bar" style={{ width: `${42 + i * 4}%` }} />
                <div className="sk-bar sk-thin" style={{ width: `${20 + i * 3}%` }} />
              </div>
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-ico"><I name="book" size={22} /></div>
            <div className="empty-title">No contracts sent yet</div>
            <div className="empty-sub mono dim">Send your first one above — takes about 10 seconds.</div>
          </div>
        ) : (
          <div className="cfi-board-list">
            <div className="cfi-board-row cfi-board-head mono">
              <div>Sent</div>
              <div>Recipient</div>
              <div>Template</div>
              <div>Status</div>
              <div>Action</div>
            </div>
            {contracts.map((c) => (
              <div key={c.id} className="cfi-board-row">
                <div>
                  <div className="mono strong">{formatDate(c.sent_at)}</div>
                  <div className="mono dim">{c.signed_at ? `signed ${formatDate(c.signed_at)}` : 'pending'}</div>
                </div>
                <div>
                  <div className="strong">{c.recipient_name}</div>
                  <div className="mono dim">{c.recipient_email}</div>
                </div>
                <div>
                  <div>{c.template_name}</div>
                </div>
                <div><Badge kind={statusKind(c.status)}>{c.status.toUpperCase()}</Badge></div>
                <div className="dc-actions">
                  {c.status !== 'signed' && (
                    <button className="btn-ghost" onClick={() => resend(c)}>Resend</button>
                  )}
                  {c.status === 'signed' && <span className="mono dim">complete</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
