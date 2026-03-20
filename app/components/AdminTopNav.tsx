'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Overview', match: ['/admin'] },
  { href: '/admin/courses', label: 'Courses', match: ['/admin/courses', '/admin/lessons'] },
  { href: '/admin/enrollments', label: 'Enrollments', match: ['/admin/enrollments'] },
  { href: '/admin/progress', label: 'Debriefs', match: ['/admin/progress'] },
  { href: '/admin/slots', label: 'Slots', match: ['/admin/slots'] },
  { href: '/admin/bookings', label: 'Bookings', match: ['/admin/bookings'] },
  { href: '/admin/leads', label: 'Prospects', match: ['/admin/leads'] },
  { href: '/admin/blog', label: 'Blog', match: ['/admin/blog'] },
  { href: '/admin/social', label: 'Social', match: ['/admin/social'] },
  { href: '/admin/email', label: 'Email', match: ['/admin/email'] },
]

export default function AdminTopNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Link href="/admin" className="text-lg font-semibold text-slate-900 hover:text-golden transition-colors">
              Merlin Admin
            </Link>
            <p className="text-sm text-slate-600">Courses, bookings, prospects, and content management in one workspace.</p>
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
      </div>
    </div>
  )
}