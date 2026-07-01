"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import AuthModal from "./AuthModal"

export default function SimpleHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const { user, isAdmin } = useAuth()

  const primaryNavLinks = [
    { href: '/', label: 'Home' },
    { href: '/aircraft', label: 'Aircraft' },
    { href: '/calculator', label: 'Calculator' },
    { href: '/start-training', label: 'Start Training' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const openAuthModal = () => {
    setMobileMenuOpen(false)
    setAuthModalOpen(true)
  }

  return (
    <>
      <header style={{
        backgroundColor: '#000',
        borderBottom: '1px solid #1f2937',
        padding: 'calc(10px + env(safe-area-inset-top, 0px)) 24px 10px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* ── Main row — 3-col grid so nav is truly centred ── */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* Logo — far left */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <Image
              src="/merlin-logo-white-textonly.png"
              alt="Merlin Flight Training"
              width={325}
              height={100}
              style={{ height: 'auto', maxHeight: '52px', width: 'auto' }}
              priority
            />
          </Link>

          {/* Desktop nav — centre, grows to fill space */}
          <ul className="desktop-nav" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}>
            {primaryNavLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} style={{ color: '#fff', fontWeight: 500, textDecoration: 'none', fontSize: '14px', whiteSpace: 'nowrap' }}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop right actions — far right */}
          <div className="desktop-actions" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}>
            {user ? (
              <>
                {isAdmin && (
                  <Link href="https://app.merlinflighttraining.com/admin" style={{ color: '#C59A2A', fontWeight: 600, textDecoration: 'none' }}>
                    Admin
                  </Link>
                )}
                <span style={{ color: '#D1D5DB', fontSize: '13px' }}>{user.email}</span>
                <button onClick={handleSignOut} style={{
                  backgroundColor: '#EF4444', color: '#fff', padding: '10px 20px',
                  borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', font: 'inherit',
                }}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/discovery-flight-funnel" style={{
                  backgroundColor: '#FFBF00', color: '#000', padding: '10px 18px',
                  borderRadius: '8px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '14px',
                }}>
                  ✈ Book Discovery Flight
                </Link>
                <button type="button" onClick={openAuthModal} style={{
                  backgroundColor: '#fff', color: '#000', padding: '10px 24px',
                  borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: '14px', whiteSpace: 'nowrap',
                }}>
                  Sign In
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger — hidden on desktop, pushed far right */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="mobile-menu-btn"
            style={{
              display: 'none',
              minHeight: '44px', minWidth: '44px',
              padding: '10px', border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: '#fff',
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* ── Mobile dropdown ── */}
        <div
          className="mobile-nav"
          style={{
            overflow: 'hidden',
            maxHeight: mobileMenuOpen ? '600px' : '0',
            opacity: mobileMenuOpen ? 1 : 0,
            transition: 'max-height 0.35s ease, opacity 0.25s ease',
          }}
        >
          <ul style={{
            listStyle: 'none', margin: '10px 0 0', padding: '16px 0 8px',
            display: 'flex', flexDirection: 'column', gap: '4px',
            borderTop: '1px solid #1f2937',
          }}>
            {primaryNavLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setMobileMenuOpen(false)} style={{
                  color: '#fff', fontWeight: 500, textDecoration: 'none',
                  display: 'block', padding: '12px 16px', borderRadius: '8px',
                }}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/discovery-flight-funnel" onClick={() => setMobileMenuOpen(false)} style={{
                backgroundColor: '#FFBF00', color: '#000', fontWeight: 700,
                textDecoration: 'none', display: 'block', padding: '14px 16px',
                borderRadius: '8px', textAlign: 'center', margin: '4px 0',
              }}>
                ✈ Book Discovery Flight
              </Link>
            </li>
            {user ? (
              <>
                {isAdmin && (
                  <li>
                    <Link href="https://app.merlinflighttraining.com/admin" onClick={() => setMobileMenuOpen(false)} style={{
                      color: '#C59A2A', fontWeight: 600, textDecoration: 'none',
                      display: 'block', padding: '12px 16px', borderRadius: '8px',
                    }}>
                      Admin
                    </Link>
                  </li>
                )}
                <li style={{ color: '#9CA3AF', fontSize: '13px', padding: '8px 16px' }}>{user.email}</li>
                <li>
                  <button onClick={() => { setMobileMenuOpen(false); handleSignOut() }} style={{
                    backgroundColor: '#EF4444', color: '#fff', padding: '14px 16px',
                    borderRadius: '8px', fontWeight: 600, display: 'block', textAlign: 'center',
                    width: '100%', border: 'none', cursor: 'pointer', font: 'inherit',
                  }}>
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <li>
                <button type="button" onClick={openAuthModal} style={{
                  backgroundColor: '#fff', color: '#000', padding: '14px 16px',
                  borderRadius: '8px', fontWeight: 600, display: 'block', textAlign: 'center',
                  width: '100%', border: 'none', cursor: 'pointer', font: 'inherit',
                }}>
                  Sign In
                </button>
              </li>
            )}
          </ul>
        </div>

        <style jsx>{`
          @media (max-width: 900px) {
            .desktop-nav { display: none !important; }
            .desktop-actions { display: none !important; }
            .mobile-menu-btn { display: flex !important; align-items: center; justify-content: center; }
          }
          @media (min-width: 901px) {
            .mobile-nav { display: none !important; }
          }
        `}</style>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
