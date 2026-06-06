'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { I, StatusLights } from '@/app/admin/ops-console/primitives'
import { useAuth } from '@/app/contexts/AuthContext'

type NavItem = {
  href: string
  key: string
  title: string
  short: string
  icon: string
  meta: string
  doc: string
  tabs: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/cfi',
    key: 'schedule',
    title: 'Schedule Board',
    short: 'Schedule',
    icon: 'cal',
    meta: '7-day instructor schedule',
    doc: 'lessons · dispatch · debrief queue',
    tabs: ['Board', 'Upcoming', 'Needs Debrief'],
  },
  {
    href: '/cfi/students',
    key: 'students',
    title: 'Student Roster',
    short: 'Students',
    icon: 'users',
    meta: 'assigned learners',
    doc: 'active students · hours · endorsements',
    tabs: ['Roster', 'Progress', 'Contacts'],
  },
  {
    href: '/cfi/scheduling',
    key: 'scheduling',
    title: 'Student Scheduling',
    short: 'Scheduling',
    icon: 'cal',
    meta: 'week-view calendar',
    doc: 'pick a slot · pick a student · book it',
    tabs: ['Week View', 'Upcoming', 'Pending'],
  },
  {
    href: '/cfi/aircraft',
    key: 'aircraft',
    title: 'Aircraft Availability',
    short: 'Aircraft',
    icon: 'plane',
    meta: 'fleet booking grid',
    doc: 'bookings · maintenance · squawks',
    tabs: ['Week View', 'Overrides', 'Squawks'],
  },
  {
    href: '/cfi/billing',
    key: 'billing',
    title: 'Billing',
    short: 'Billing',
    icon: 'wallet',
    meta: 'send flight + instruction bills',
    doc: 'flight hours · instruction hours · auto-total',
    tabs: ['Send Bill', 'Invoices', 'Paid'],
  },
  {
    href: '/cfi/contracts',
    key: 'contracts',
    title: 'Contracts',
    short: 'Contracts',
    icon: 'book',
    meta: 'onboarding & agreements',
    doc: 'email · button · signed',
    tabs: ['Send', 'Sent', 'Templates'],
  },
  {
    href: '/cfi/availability',
    key: 'availability',
    title: 'Availability Matrix',
    short: 'Availability',
    icon: 'cal',
    meta: 'weekly blocks',
    doc: 'recurring weekly templates',
    tabs: ['Weekly', 'Exceptions', 'Utilization'],
  },
  {
    href: '/cfi/log',
    key: 'log',
    title: 'Flight Log',
    short: 'Flight Log',
    icon: 'book',
    meta: 'hours and endorsements',
    doc: 'flight time · endorsements · signatures',
    tabs: ['Hours', 'Endorsements', 'Audit'],
  },
]

function initials(email?: string | null) {
  if (!email) return 'CF'
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CF'
}

export default function CFIOpsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, signOut, isAdmin } = useAuth()

  const active = useMemo(() => {
    return [...NAV_ITEMS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? NAV_ITEMS[0]
  }, [pathname])

  const cfiInitials = initials(user?.email)

  return (
    <div className="ops-console-root cfi-ops-root density-compact data-mono" data-theme="dark">
      <div className="app cfi-ops-app">
        <header className="topbar">
          <div className="tb-brand">
            <img src="/merlin-logo.png" className="tb-logo" alt="Merlin" />
            <span className="tb-wordmark">MERLIN</span>
            <span className="tb-wordmark-sub mono">· CFI</span>
          </div>
          <div className="tb-path">
            <span className="mono">workspace / merlin-prod / instructor /</span> <b>{active.title}</b>
          </div>
          <div className="tb-right">
            <StatusLights />
            <span className="env-pill">LOCAL · KPNE</span>
            <span className="mono tb-time">{user?.email ?? 'cfi session'}</span>
            {isAdmin && (
              <Link className="btn-ghost" href="/admin/ops-console">
                Ops
              </Link>
            )}
            <button className="icon-btn" title="Sign out" onClick={() => void signOut()}>
              <I name="lock" />
            </button>
            <span className="avatar avatar-blue">{cfiInitials}</span>
          </div>
        </header>

        <aside className="sidebar">
          <div className="sidebar-head">
            <div className="sb-brand">
              <img src="/merlin-logo.png" className="sb-logo" alt="Merlin Flight Training" />
              <div className="sb-brand-text">
                <div className="sb-brand-name">MERLIN</div>
                <div className="sb-brand-tag mono">INSTRUCTOR OPS</div>
              </div>
            </div>
            <div className="sidebar-sub">KPNE · Northeast Philadelphia · CFI Workspace</div>
          </div>

          <div className="sidebar-search">
            <I name="search" />
            <input type="text" placeholder="Search students, lessons, logs..." readOnly />
            <kbd>⌘K</kbd>
          </div>

          <div className="sidebar-actions">
            <button className="btn-ghost">
              <I name="filter" /> Today
            </button>
            <button className="btn-ghost">
              <I name="refresh" /> Sync
            </button>
          </div>

          <nav className="tree" aria-label="CFI workspace">
            <div className="tree-row tree-row-static">
              <span className="tree-chev"><I name="chev-d" /></span>
              <span className="tree-label mono dim">OPERATIONS</span>
              <span className="tree-count">{NAV_ITEMS.length}</span>
            </div>
            {NAV_ITEMS.map((item) => {
              const selected = item.key === active.key
              return (
                <Link key={item.key} href={item.href} className={`tree-row tree-row-link ${selected ? 'sel' : ''}`}>
                  <span className="tree-chev" />
                  <span className="tree-ico"><I name={item.icon} /></span>
                  <span className="tree-label">{item.short}</span>
                  <span className="tree-sub">{item.meta}</span>
                </Link>
              )
            })}
          </nav>

          <div className="sidebar-foot">
            <div className="foot-row"><span className="foot-k">Session</span><span className="foot-v mono">{user?.email ?? 'cfi'}</span></div>
            <div className="foot-row"><span className="foot-k">Base</span><span className="foot-v mono">KPNE</span></div>
            <div className="foot-row"><span className="foot-k">Mode</span><span className="foot-v mono">instructor</span></div>
          </div>
        </aside>

        <main className="main">
          <div className="icon-rail">
            {NAV_ITEMS.map((item) => (
              <Link key={item.key} href={item.href} className={`rail-btn ${item.key === active.key ? 'act' : ''}`} title={item.short}>
                <I name={item.icon} size={14} />
              </Link>
            ))}
            <div className="rail-spacer" />
            <Link href="/admin" className="rail-btn" title="Admin">
              <I name="settings" size={14} />
            </Link>
          </div>
          <div className="main-inner">
            <div className="doc-nav">
              <div className="doc-crumbs mono">
                <span className="dim">workspace</span>
                <span className="crumb-sep">›</span>
                <span className="dim">cfi</span>
                <span className="crumb-sep">›</span>
                <span>{active.title}</span>
              </div>
              <div className="doc-spacer" />
              <span className="doc-meta mono dim">{active.doc}</span>
            </div>
            <div className="sub-tabs">
              {active.tabs.map((tab, index) => (
                <button key={tab} className={`sub-tab ${index === 0 ? 'act' : ''}`}>{tab}</button>
              ))}
              <div className="sub-tabs-spacer" />
              <button className="btn-ghost icon" title="More"><I name="more" /></button>
            </div>
            <div className="main-canvas">
              {children}
            </div>
          </div>
        </main>

        <div className="timeline pulse">
          <div className="pulse-head">
            <span className="mono pulse-title">INSTRUCTOR PULSE</span>
            <span className="mono dim">LIVE · KPNE</span>
            <span className="pulse-health">
              <span className="sl sl-green" /><span className="mono dim">CFI READY</span>
              <span className="pulse-sep">·</span>
              <span className="mono"><b className="warn">2</b> OPEN</span>
            </span>
            <span className="pulse-right mono dim">brief · fly · debrief · log</span>
          </div>
          <div className="pulse-body">
            <div className="pulse-col">
              <div className="pulse-col-h mono">NEXT UP</div>
              <div className="pulse-dep">
                <div className="pd-time"><span className="pd-clock">10:00</span><span className="pd-tminus mono dim">T+45</span></div>
                <div className="pd-main"><div className="pd-line1"><span className="pd-tail mono">N511MF</span><span className="pd-student">Maya Chen</span></div><div className="pd-line2 mono dim">PPL · steep turns</div></div>
              </div>
              <div className="pulse-dep">
                <div className="pd-time"><span className="pd-clock">13:30</span><span className="pd-tminus mono dim">TODAY</span></div>
                <div className="pd-main"><div className="pd-line1"><span className="pd-tail mono">N734MA</span><span className="pd-student">Daniel Rivera</span></div><div className="pd-line2 mono dim">Discovery flight</div></div>
              </div>
            </div>
            <div className="pulse-col">
              <div className="pulse-col-h mono">NEEDS ACTION</div>
              <div className="pulse-action pa-warn"><span className="pa-dot" /><span className="pa-label">2 pending lesson confirmations</span></div>
              <div className="pulse-action pa-info"><span className="pa-dot" /><span className="pa-label">1 endorsement ready to record</span></div>
            </div>
            <div className="pulse-col">
              <div className="pulse-col-h mono">QUICK LINKS</div>
              <Link className="pulse-action" href="/cfi/log"><span className="pa-dot" /><span className="pa-label">Open flight log</span></Link>
              <Link className="pulse-action" href="/cfi/availability"><span className="pa-dot" /><span className="pa-label">Edit availability</span></Link>
            </div>
          </div>
        </div>

        <aside className="inspector">
          <div className="ins-head">
            <span className="mono">CFI PACKET</span>
            <span className="mono dim">{active.short}</span>
          </div>
          <div className="ins-hero">
            <div className="hero-id mono">INSTRUCTOR</div>
            <div className="hero-title">{user?.email?.split('@')[0] ?? 'CFI Workspace'}</div>
            <div className="hero-sub mono dim">KPNE · Grumman AA-5A · active queue</div>
            <div className="hero-chips">
              <span className="chip chip-muted mono">AUTH OK</span>
              <span className="chip" style={{ background: 'var(--ok-bg)', borderColor: 'var(--ok-1)', color: 'var(--ok-text)' }}>
                <span className="chip-dot" style={{ background: 'var(--ok-1)' }} />READY
              </span>
            </div>
          </div>
          <div className="ins-sect-head"><span className="mono">TODAY</span></div>
          <div className="f-row"><span className="f-label mono">Lessons</span><span className="f-val mono">3</span></div>
          <div className="f-row"><span className="f-label mono">Pending</span><span className="f-val mono warn">2</span></div>
          <div className="f-row"><span className="f-label mono">Students</span><span className="f-val mono">4 active</span></div>
          <div className="ins-sect-head"><span className="mono">ACTIONS</span></div>
          <div className="ins-actions">
            <Link className="btn-ghost" href="/cfi/availability">Availability</Link>
            <Link className="btn-primary" href="/cfi/log"><I name="check" /> Log</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
