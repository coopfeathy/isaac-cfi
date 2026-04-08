"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "@/lib/supabase"

export default function SimpleHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isAdmin } = useAuth()
  const primaryNavLinks = [
    { href: '/', label: 'Home' },
    { href: '/schedule', label: 'Schedule' },
    { href: '/aircraft', label: 'Aircraft' },
    { href: '/learn', label: 'Learn' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/store', label: 'Store' },
    { href: '/faq', label: 'FAQ' },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header style={{ 
      backgroundColor: 'white', 
      borderBottom: '1px solid #e5e7eb',
      padding: 'calc(10px + env(safe-area-inset-top, 0px)) 16px 10px',
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
              minHeight: '44px',
              minWidth: '44px',
              padding: '10px',
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
            gap: '20px',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            alignItems: 'center'
          }}
          className="desktop-nav"
          >
            {primaryNavLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} style={{ color: '#374151', fontWeight: 500, textDecoration: 'none' }}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/discovery-flight-funnel"
                style={{
                  backgroundColor: '#FFBF00',
                  color: '#000',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                }}
              >
                ✈ Book Discovery Flight
              </Link>
            </li>
            {user ? (
              <>
                {isAdmin && (
                  <li>
                    <Link href="/admin" style={{ color: '#C59A2A', fontWeight: 600, textDecoration: 'none' }}>
                      Admin
                    </Link>
                  </li>
                )}
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
            ) : (
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
            )}
          </ul>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div style={{
            marginTop: '20px',
            paddingTop: '12px',
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
              gap: '10px'
            }}>
              {primaryNavLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      color: '#374151',
                      fontWeight: 500,
                      textDecoration: 'none',
                      display: 'block',
                      padding: '14px 16px',
                      borderRadius: '8px'
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/discovery-flight-funnel"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    backgroundColor: '#FFBF00',
                    color: '#000',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'block',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  ✈ Book Discovery Flight
                </Link>
              </li>
              {user ? (
                <>
                  {isAdmin && (
                    <li>
                      <Link 
                        href="/admin" 
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ 
                          color: '#C59A2A', 
                          fontWeight: 600, 
                          textDecoration: 'none',
                          display: 'block',
                          padding: '14px 16px',
                          borderRadius: '8px'
                        }}
                      >
                        Admin
                      </Link>
                    </li>
                  )}
                  <li style={{ 
                    color: '#6B7280', 
                    fontSize: '14px',
                    padding: '12px 16px'
                  }}>
                    {user.email}
                  </li>
                  <li>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleSignOut()
                      }}
                      style={{ 
                        backgroundColor: '#EF4444', 
                        color: '#fff', 
                        padding: '14px 16px', 
                        borderRadius: '8px', 
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'block',
                        textAlign: 'center',
                        width: '100%',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Sign Out
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link 
                    href="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ 
                      backgroundColor: '#000', 
                      color: '#fff', 
                      padding: '14px 16px', 
                      borderRadius: '8px', 
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'block',
                      textAlign: 'center'
                    }}
                  >
                    Sign In
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </nav>

      <style jsx>{`
        @media (max-width: 900px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          header {
            backdrop-filter: saturate(180%) blur(8px);
            background-color: rgba(255, 255, 255, 0.95) !important;
          }
        }
        @media (min-width: 901px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </header>
  )
}
