'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type NavSection = {
  label: string
  icon: 'learn' | 'students' | 'schedule' | 'content' | 'finance'
  items: { href: string; label: string; match: string[] }[]
}

const SIDEBAR_OPEN_KEY = 'merlin_admin_sidebar_open_v1'

const navSections: NavSection[] = [
  {
    label: 'Learn Platform',
    icon: 'learn',
    items: [
      { href: '/admin/courses', label: 'Manage Courses', match: ['/admin/courses', '/admin/lessons'] },
      { href: '/admin/enrollments', label: 'Assign Students', match: ['/admin/enrollments'] },
      { href: '/admin/progress', label: 'Lesson Debriefs', match: ['/admin/progress'] },
    ],
  },
  {
    label: 'Students & Prospects',
    icon: 'students',
    items: [
      { href: '/admin/students', label: 'Students', match: ['/admin/students'] },
      { href: '/admin/billing', label: 'Billing', match: ['/admin/billing'] },
      { href: '/admin/expenses', label: 'Account Balances', match: ['/admin/expenses'] },
      { href: '/admin/prospects', label: 'Prospects', match: ['/admin/prospects', '/admin/leads'] },
      { href: '/admin/onboarding', label: 'Onboarding Queue', match: ['/admin/onboarding'] },
    ],
  },
  {
    label: 'Bookings & Schedule',
    icon: 'schedule',
    items: [
      { href: '/admin/slots', label: 'Manage Slots', match: ['/admin/slots'] },
      { href: '/admin/bookings', label: 'View Bookings', match: ['/admin/bookings'] },
      { href: '/admin/calendar', label: 'Calendar Sync', match: ['/admin/calendar'] },
      { href: '/admin/aircraft', label: 'Aircraft Flight Log', match: ['/admin/aircraft'] },
      { href: '/admin/items', label: 'Training Items', match: ['/admin/items'] },
    ],
  },
  {
    label: 'Content Management',
    icon: 'content',
    items: [
      { href: '/admin/blog', label: 'Create Blog Post', match: ['/admin/blog'] },
      { href: '/admin/social', label: 'Manage Social Posts', match: ['/admin/social'] },
      { href: '/admin/email', label: 'Email Campaigns', match: ['/admin/email'] },
    ],
  },
  {
    label: 'Finance',
    icon: 'finance',
    items: [
      { href: '/admin/revenue', label: 'Revenue Tracker', match: ['/admin/revenue'] },
    ],
  },
]

const allNavItems = navSections.flatMap((section) => section.items)

function SectionIcon({ icon }: { icon: NavSection['icon'] }) {
  const common = 'h-4 w-4'

  switch (icon) {
    case 'learn':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden="true">
          <path d="M3 8.5 12 4l9 4.5-9 4.5L3 8.5Z" />
          <path d="M7 10.5V15c0 1.2 2.2 3 5 3s5-1.8 5-3v-4.5" />
        </svg>
      )
    case 'students':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden="true">
          <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
          <circle cx="9.5" cy="7" r="3" />
          <path d="M21 19v-1a4 4 0 0 0-3-3.87" />
          <path d="M16 4.13a3 3 0 0 1 0 5.74" />
        </svg>
      )
    case 'schedule':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      )
    case 'content':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      )
    case 'finance':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden="true">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
  }
}

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
        <path d="m18 6-12 12M6 6l12 12" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export default function AdminTopNav() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isDesktopOpen, setIsDesktopOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(SIDEBAR_OPEN_KEY)
    setIsDesktopOpen(stored === '1')
  }, [])

  const toggleDesktopSidebar = () => {
    setIsDesktopOpen((previous) => {
      const next = !previous
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIDEBAR_OPEN_KEY, next ? '1' : '0')
      }
      return next
    })
  }

  const currentPageLabel = allNavItems.find((item) =>
    item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  )?.label || 'Workspace'

  const navContent = (
    <>
      <div className="mb-5 rounded-2xl border border-[#E9D7A5] bg-gradient-to-br from-white to-[#FFF7E0] p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9A7A17]">Merlin Admin</p>
        <p className="mt-2 text-sm font-semibold text-darkText">Current: {currentPageLabel}</p>
        <p className="mt-1 text-xs text-slate-600">Operations workspace</p>
      </div>

      <div className="mb-4">
        <Link
          href="/admin"
          className="inline-flex w-full items-center justify-center rounded-xl border border-[#E9D7A5] bg-white px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFF9EC]"
          onClick={() => setIsMobileOpen(false)}
        >
          Back to Admin Dashboard
        </Link>
      </div>

      <nav className="space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7A17]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FFF1BF] text-[#8A6A00]">
                <SectionIcon icon={section.icon} />
              </span>
              <span>{section.label}</span>
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
                    onClick={() => setIsMobileOpen(false)}
                    className={[
                      'block rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-[#D7B24A] bg-[#FFF3C9] text-darkText shadow-sm'
                        : 'border-[#ECE7D6] bg-white text-slate-700 hover:border-[#DCC56F] hover:bg-[#FFFDF7]',
                    ].join(' ')}
                  >
                    {item.label}
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
      <button
        type="button"
        onClick={toggleDesktopSidebar}
        className="fixed left-4 top-[88px] z-40 hidden h-12 w-12 items-center justify-center rounded-full border border-[#D7B24A] bg-[#FFF3C9]/95 text-darkText shadow-[0_10px_30px_rgba(197,154,42,0.22)] backdrop-blur transition hover:bg-[#FFE79A] lg:inline-flex"
        aria-expanded={isDesktopOpen}
        aria-controls="admin-desktop-side-nav"
        title={isDesktopOpen ? 'Hide admin menu' : 'Show admin menu'}
      >
        <MenuIcon open={isDesktopOpen} />
      </button>

      <div className="sticky top-[72px] z-40 border-b border-[#E9D7A5] bg-white/95 px-4 py-3 backdrop-blur md:hidden supports-[backdrop-filter]:bg-white/80">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9A7A17]">Merlin Admin</p>
            <p className="truncate text-sm font-semibold text-darkText">{currentPageLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-[#D7B24A] bg-[#FFF7E0] px-3 py-2 text-sm font-medium text-darkText transition-colors hover:bg-[#FFF1BF]"
            aria-expanded={isMobileOpen}
            aria-controls="admin-mobile-side-nav"
          >
            <MenuIcon open={isMobileOpen} />
            {isMobileOpen ? 'Hide Menu' : 'Show Menu'}
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setIsMobileOpen(false)}>
          <aside
            id="admin-mobile-side-nav"
            className="h-full w-[320px] max-w-[85vw] overflow-y-auto border-r border-[#E9D7A5] bg-[#FFFCF4]/98 p-4 shadow-xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}

      <aside
        id="admin-desktop-side-nav"
        className={[
          'fixed left-4 top-[140px] z-30 hidden max-h-[calc(100vh-164px)] w-[320px] overflow-y-auto rounded-3xl border border-[#E9D7A5] bg-[#FFFCF4]/96 p-4 shadow-[0_18px_50px_rgba(197,154,42,0.12)] backdrop-blur transition-all duration-200 lg:block',
          isDesktopOpen ? 'translate-x-0 opacity-100' : '-translate-x-[110%] opacity-0 pointer-events-none',
        ].join(' ')}
      >
        {navContent}
      </aside>
    </>
  )
}