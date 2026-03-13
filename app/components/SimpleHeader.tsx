"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "@/lib/supabase"

function NavDropdown({ title, href, items, color = '#374151' }: { title: string, href: string, items: { label: string, href: string }[], color?: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <li 
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
    >
      <Link href={href} style={{ color, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {title}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.7 }}>
           <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%', /* Offset to appear below */
          left: '-10px',
          backgroundColor: 'white',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          borderRadius: '0.5rem',
          padding: '0.5rem',
          minWidth: '220px',
          zIndex: 100,
          border: '1px solid #f3f4f6',
          marginTop: '0px'
        }}>
          {items.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-golden/10 hover:text-golden rounded-md transition-colors"
              style={{ textDecoration: 'none', display: 'block', padding: '8px 16px', color: '#374151' }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </li>
  )
}

export default function SimpleHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isAdmin } = useAuth()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Debug logging
  console.log('SimpleHeader Debug:', {
    user: user?.email,
    isAdmin,
    adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL
  })

  // Navigation Items
  const publicNavItems = [
    { label: 'Schedule', href: '/schedule' },
    { label: 'Aircraft', href: '/aircraft' },
    { label: 'Blog', href: '/blog' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'FAQ', href: '/faq' },
  ]

  return (
    <header style={{ 
      backgroundColor: 'white', 
      borderBottom: '1px solid #e5e7eb',
      padding: '12px 20px',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <nav style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image 
              src="/merlin-logo.png" 
              alt="Merlin Flight Training" 
              width={150} 
              height={150}
              style={{ height: 'auto', maxHeight: '60px', width: 'auto' }}
              priority
            />
          </Link>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              padding: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
            className="mobile-menu-btn"
          >
            <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          {/* Desktop navigation */}
          <ul style={{ 
            display: 'flex', 
            gap: '30px', 
            listStyle: 'none', 
            margin: 0, 
            padding: 0,
            alignItems: 'center'
          }}
          className="desktop-nav"
          >
            {!user ? (
               // Logged Out View - Standard Links
               <>
                 <li>
                   <Link href="/" style={{ color: '#374151', fontWeight: 500, textDecoration: 'none' }}>
                     Home
                   </Link>
                 </li>
                 {publicNavItems.map(item => (
                   <li key={item.href}>
                     <Link href={item.href} style={{ color: '#374151', fontWeight: 500, textDecoration: 'none' }}>
                       {item.label}
                     </Link>
                   </li>
                 ))}
                 <li>
                   <Link 
                     href="/login" 
                     style={{ 
                       backgroundColor: '#000', 
                       color: '#fff', 
                       padding: '10px 30px', 
                       borderRadius: '8px', 
                       fontWeight: 600,
                       textDecoration: 'none',
                       display: 'inline-block'
                     }}
                   >
                     Sign In
                   </Link>
                 </li>
               </>
            ) : (
              // Logged In View - Dropdowns
              <>
                 <NavDropdown 
                   title="Home" 
                   href="/" 
                   items={publicNavItems} 
                 />

                {isAdmin && (
                  <>
                    <li>
                      <Link href="/manage/users" style={{ color: '#C59A2A', fontWeight: 600, textDecoration: 'none' }}>
                        Manage
                      </Link>
                    </li>
                    <li>
                      <Link href="/dashboard" style={{ color: '#C59A2A', fontWeight: 600, textDecoration: 'none' }}>
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link href="/prospects" style={{ color: '#C59A2A', fontWeight: 600, textDecoration: 'none' }}>
                        Prospects
                      </Link>
                    </li>
                    <li>
                      <Link href="/students" style={{ color: '#C59A2A', fontWeight: 600, textDecoration: 'none' }}>
                        Students
                      </Link>
                    </li>
                  </>
                )}
                <li>
                  <Link href="/bookings" style={{ color: '#374151', fontWeight: 500, textDecoration: 'none' }}>
                    My Bookings
                  </Link>
                </li>
                <li style={{ color: '#6B7280', fontSize: '14px' }}>
                  {user.email}
                </li>
                <li>
                  <button 
                    onClick={handleSignOut}
                    style={{ 
                      backgroundColor: '#EF4444', 
                      color: '#fff', 
                      padding: '10px 30px', 
                      borderRadius: '8px', 
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Sign Out
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb'
          }}
          className="mobile-nav"
          >
            <ul style={{ 
              listStyle: 'none', 
              margin: 0, 
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {!user ? (
                // Logged Out Mobile
                <>
                  <li><Link href="/" style={{ color: '#374151', textDecoration: 'none' }}>Home</Link></li>
                  {publicNavItems.map(item => (
                    <li key={item.href}>
                      <Link href={item.href} style={{ color: '#374151', textDecoration: 'none' }}>{item.label}</Link>
                    </li>
                  ))}
                  <li><Link href="/login">Sign In</Link></li>
                </>
              ) : (
                // Logged In Mobile - Flatten Lists for easier access
                <>
                   <li className="font-bold text-gray-400 text-xs uppercase tracking-wider">Pages</li>
                   <li><Link href="/" style={{ color: '#374151', textDecoration: 'none' }}>Home</Link></li>
                   {publicNavItems.map(item => (
                    <li key={item.href} style={{ paddingLeft: '10px' }}>
                      <Link href={item.href} style={{ color: '#374151', textDecoration: 'none' }}>{item.label}</Link>
                    </li>
                   ))}
                   
                   {isAdmin && (
                    <>
                      <li className="font-bold text-gray-400 text-xs uppercase tracking-wider mt-4">Admin</li>
                      <li><Link href="/manage/users" style={{ color: '#C59A2A', textDecoration: 'none' }}>Manage</Link></li>
                      <li><Link href="/dashboard" style={{ color: '#C59A2A', textDecoration: 'none' }}>Dashboard</Link></li>
                      <li><Link href="/prospects" style={{ color: '#C59A2A', textDecoration: 'none' }}>Prospects</Link></li>
                      <li><Link href="/students" style={{ color: '#C59A2A', textDecoration: 'none' }}>Students</Link></li>
                    </>
                   )}
                   
                   <li className="mt-4"><Link href="/bookings">My Bookings</Link></li>
                   <li><button onClick={handleSignOut} style={{ color: '#EF4444' }}>Sign Out</button></li>
                </>
              )}
            </ul>
          </div>
        )}
      </nav>

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </header>
  )
}
