'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin/courses', label: 'Courses', match: ['/admin/courses', '/admin/lessons'] },
  { href: '/admin/enrollments', label: 'Enrollments', match: ['/admin/enrollments'] },
  { href: '/admin/progress', label: 'Debriefs', match: ['/admin/progress'] },
  { href: '/admin/students', label: 'Students', match: ['/admin/students'] },
  { href: '/admin/billing', label: 'Billing', match: ['/admin/billing'] },
  { href: '/admin/items', label: 'Training Items', match: ['/admin/items'] },
  { href: '/admin/slots', label: 'Slots', match: ['/admin/slots'] },
  { href: '/admin/bookings', label: 'Bookings', match: ['/admin/bookings'] },
  { href: '/admin/prospects', label: 'Prospects', match: ['/admin/prospects', '/admin/leads'] },
  { href: '/admin/onboarding', label: 'Onboarding', match: ['/admin/onboarding'] },
  { href: '/admin/blog', label: 'Blog', match: ['/admin/blog'] },
  { href: '/admin/social', label: 'Social', match: ['/admin/social'] },
  { href: '/admin/email', label: 'Email', match: ['/admin/email'] },
]

export default function AdminTopNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)

  if (pathname === '/admin') {
    return null
  }

  const currentSection = navItems.find((item) =>
    item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  )?.label || 'Workspace'

  return (
    <div className="sticky top-[72px] z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:top-[80px]">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-900">Merlin Admin</div>
            <p className="truncate text-sm text-slate-600">{currentSection} workspace</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            aria-expanded={isOpen}
            aria-controls="admin-top-nav-content"
          >
            {isOpen ? 'Hide Menu' : 'Show Menu'}
          </button>
        </div>

        {isOpen && (
          <div id="admin-top-nav-content" className="mt-3">
            <div className="mb-3">
              <Link
                href="/admin"
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                ← Back to Admin
              </Link>
            </div>
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const isActive = item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-golden bg-golden/15 text-darkText'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}