'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'

const SIDEBAR_OPEN_KEY = 'merlin_cfi_sidebar_open_v1'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  match: string[]
}

const navItems: NavItem[] = [
  {
    href: '/cfi',
    label: 'Schedule',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    match: ['/cfi'],
  },
  {
    href: '/cfi/students',
    label: 'My Students',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    match: ['/cfi/students'],
  },
  {
    href: '/cfi/availability',
    label: 'Availability',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
    match: ['/cfi/availability'],
  },
  {
    href: '/cfi/log',
    label: 'Flight Log',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    match: ['/cfi/log'],
  },
]

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

export default function CFITopNav() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
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

  const currentPageLabel = navItems.find((item) =>
    item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  )?.label || 'CFI Workspace'

  const navContent = (
    <>
      <div className="mb-5 rounded-2xl border border-[#E9D7A5] bg-gradient-to-br from-white to-[#FFF7E0] p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9A7A17]">CFI Workspace</p>
        <p className="mt-2 text-sm font-semibold text-darkText">Current: {currentPageLabel}</p>
        <p className="mt-1 text-xs text-slate-600">Instructor portal</p>
      </div>

      {isAdmin && (
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-flex w-full items-center justify-center rounded-xl border border-[#E9D7A5] bg-white px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFF9EC]"
            onClick={() => setIsMobileOpen(false)}
          >
            Back to Admin
          </Link>
        </div>
      )}

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = item.match.some(
            (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
          )

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={[
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-[#D7B24A] bg-[#FFF3C9] text-darkText shadow-sm'
                  : 'border-[#ECE7D6] bg-white text-slate-700 hover:border-[#DCC56F] hover:bg-[#FFFDF7]',
              ].join(' ')}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
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
        aria-controls="cfi-desktop-side-nav"
        title={isDesktopOpen ? 'Hide CFI menu' : 'Show CFI menu'}
      >
        <MenuIcon open={isDesktopOpen} />
      </button>

      <div className="sticky top-[72px] z-40 border-b border-[#E9D7A5] bg-white/95 px-4 py-3 backdrop-blur md:hidden supports-[backdrop-filter]:bg-white/80">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9A7A17]">CFI Workspace</p>
            <p className="truncate text-sm font-semibold text-darkText">{currentPageLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-[#D7B24A] bg-[#FFF7E0] px-3 py-2 text-sm font-medium text-darkText transition-colors hover:bg-[#FFF1BF]"
            aria-expanded={isMobileOpen}
            aria-controls="cfi-mobile-side-nav"
          >
            <MenuIcon open={isMobileOpen} />
            {isMobileOpen ? 'Hide Menu' : 'Show Menu'}
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setIsMobileOpen(false)}>
          <aside
            id="cfi-mobile-side-nav"
            className="h-full w-[320px] max-w-[85vw] overflow-y-auto border-r border-[#E9D7A5] bg-[#FFFCF4]/98 p-4 shadow-xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}

      <aside
        id="cfi-desktop-side-nav"
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
