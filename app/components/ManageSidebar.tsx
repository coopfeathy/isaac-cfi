'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'

const manageSections = [
  {
    name: 'General',
    items: [
      { label: 'Users', href: '/manage/users', icon: '👥' },
      { label: 'Administrators', href: '/manage/administrators', icon: '🔐' },
      { label: 'Instructors', href: '/manage/instructors', icon: '✈️' },
      { label: 'Groups', href: '/manage/groups', icon: '👫' },
    ]
  },
  {
    name: 'Operations',
    items: [
      { label: 'Aircraft', href: '/manage/aircraft', icon: '🛫' },
      { label: 'Schedule', href: '/manage/schedule', icon: '📅' },
      { label: 'Items', href: '/manage/items', icon: '📦' },
      { label: 'Adjustments', href: '/manage/adjustments', icon: '💰' },
    ]
  },
  {
    name: 'Customization',
    items: [
      { label: 'Forms', href: '/manage/forms', icon: '📋' },
    ]
  }
]

export default function ManageSidebar() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const router = useRouter()

  if (!isAdmin) {
    return null
  }

  return (
    <aside style={{
      width: '280px',
      backgroundColor: '#1f2937',
      color: '#fff',
      padding: '24px 0',
      height: '100vh',
      overflowY: 'auto',
      position: 'fixed',
      left: 0,
      top: 0
    }}>
      {/* Header */}
      <div style={{ padding: '0 20px 30px 20px', borderBottom: '1px solid #374151' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Manager</h2>
      </div>

      {/* Sections */}
      <nav style={{ padding: '20px 0' }}>
        {manageSections.map((section) => (
          <div key={section.name} style={{ marginBottom: '30px' }}>
            {/* Section Title */}
            <div style={{
              padding: '12px 20px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {section.name}
            </div>

            {/* Section Items */}
            {section.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    color: isActive ? '#C59A2A' : '#d1d5db',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? 'rgba(197, 154, 42, 0.1)' : 'transparent',
                    borderLeft: isActive ? '3px solid #C59A2A' : '3px solid transparent',
                    marginLeft: 0,
                    paddingLeft: '17px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#374151'
                      e.currentTarget.style.color = '#f3f4f6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#d1d5db'
                    }
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
