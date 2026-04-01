'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type NavSection = {
  label: string
  icon: string
  items: { href: string; label: string; match: string[] }[]
}

const SIDEBAR_COLLAPSE_KEY = 'merlin_admin_sidebar_collapsed_v1'

const navSections: NavSection[] = [
  {
    label: 'Learn Platform',
    icon: '🎓',
    items: [
      { href: '/admin/courses', label: 'Manage Courses', match: ['/admin/courses', '/admin/lessons'] },
      { href: '/admin/enrollments', label: 'Assign Students', match: ['/admin/enrollments'] },
      { href: '/admin/progress', label: 'Lesson Debriefs', match: ['/admin/progress'] },
    ],
  },
  {
    label: 'Students & Prospects',
    icon: '🧑‍🤝‍🧑',
    items: [
      { href: '/admin/students', label: 'Students', match: ['/admin/students'] },
      { href: '/admin/billing', label: 'Billing', match: ['/admin/billing'] },
      { href: '/admin/prospects', label: 'Prospects', match: ['/admin/prospects', '/admin/leads'] },
      { href: '/admin/onboarding', label: 'Onboarding Queue', match: ['/admin/onboarding'] },
    ],
  },
  {
    label: 'Bookings & Schedule',
    icon: '📅',
    items: [
      { href: '/admin/slots', label: 'Manage Slots', match: ['/admin/slots'] },
      { href: '/admin/bookings', label: 'View Bookings', match: ['/admin/bookings'] },
      { href: '/admin/aircraft', label: 'Aircraft Flight Log', match: ['/admin/aircraft'] },
      { href: '/admin/items', label: 'Training Items', match: ['/admin/items'] },
    ],
  },
  {
    label: 'Content Management',
    icon: '📝',
    items: [
      { href: '/admin/blog', label: 'Create Blog Post', match: ['/admin/blog'] },
      { href: '/admin/social', label: 'Manage Social Posts', match: ['/admin/social'] },
      { href: '/admin/email', label: 'Email Campaigns', match: ['/admin/email'] },
    ],
  },
]

const allNavItems = navSections.flatMap((section) => section.items)

export default function AdminTopNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY)
    setIsCollapsed(stored === '1')
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((previous) => {
      const next = !previous
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0')
      }
      return next
    })
  }

  const currentPageLabel = allNavItems.find((item) =>
    item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  )?.label || 'Workspace'

  const navContent = (
    <>
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Merlin Admin</p>
        {!isCollapsed && <p className="mt-2 text-sm text-slate-600">Current: {currentPageLabel}</p>}
      </div>

      <div className="mb-4">
        <Link
          href="/admin"
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          onClick={() => setIsOpen(false)}
        >
          {isCollapsed ? '←' : 'Back to Admin Dashboard'}
        </Link>
      </div>

      <nav className="space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>{section.icon}</span>
              {!isCollapsed && <span>{section.label}</span>}
            </p>
            <div className="space-y-2">
              {section.items.map((item) => {
                const isActive = item.match.some(
                  (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
                )

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={[
                      'block rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-golden bg-golden/15 text-darkText'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                    ].join(' ')}
                    title={item.label}
                  >
                    {isCollapsed ? item.label.split(' ').map((word) => word[0]).join('').slice(0, 3) : item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  )

  return (
    <>
      <div className="sticky top-[72px] z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden supports-[backdrop-filter]:bg-white/80">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Merlin Admin</p>
            <p className="truncate text-sm font-semibold text-slate-800">{currentPageLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            aria-expanded={isOpen}
            aria-controls="admin-side-nav-content"
          >
            {isOpen ? 'Hide Menu' : 'Show Menu'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setIsOpen(false)}>
          <aside
            id="admin-side-nav-content"
            className="h-full w-[320px] max-w-[85vw] overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 top-[80px] z-30 hidden overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 transition-all duration-200 lg:block ${
        isCollapsed ? 'w-24' : 'w-72'
      }`}>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={toggleCollapse}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
        {navContent}
      </aside>
    </>
  )
}