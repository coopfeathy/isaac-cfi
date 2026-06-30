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
    { href: '/schedule', label: 'Schedule' },
    { href: '/aircraft', label: 'Aircraft' },
    { href: '/learn', label: 'Learn' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/offers', label: 'Offers' },
    { href: '/store', label: 'Store' },
    { href: '/weddings', label: 'Weddings' },
    { href: '/faq', label: 'FAQ' },
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
      <header className="site-header">
        <nav className="header-nav">
          {/* ── Logo ── */}
          <Link href="/" className="header-logo">
            <Image
              src="/merlin-logo-white-textonly.png"
              alt="Merlin Flight Training"
              width={325}
              height={100}
              style={{ height: 'auto', maxHeight: '52px', width: 'auto' }}
              priority
            />
          </Link>

          {/* ── Desktop centre nav ── */}
          <ul className="desktop-nav">
            {primaryNavLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="nav-link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Desktop right actions ── */}
          <div className="desktop-actions">
            {user ? (
              <>
                {isAdmin && (
                  <Link href="https://app.merlinflighttraining.com/admin" className="admin-link">
                    Admin
                  </Link>
                )}
                <span className="user-email">{user.email}</span>
                <button onClick={handleSignOut} className="btn-signout">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/discovery-flight-funnel" className="btn-discovery">
                  ✈ Book Discovery Flight
                </Link>
                <button type="button" onClick={openAuthModal} className="btn-signin">
                  Sign In
                </button>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="hamburger"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>

        {/* ── Mobile dropdown ── */}
        <div className={`mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
          <ul className="mobile-nav-list">
            {primaryNavLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/discovery-flight-funnel"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-discovery"
              >
                ✈ Book Discovery Flight
              </Link>
            </li>
            {user ? (
              <>
                {isAdmin && (
                  <li>
                    <Link
                      href="https://app.merlinflighttraining.com/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-admin-link"
                    >
                      Admin
                    </Link>
                  </li>
                )}
                <li className="mobile-email">{user.email}</li>
                <li>
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleSignOut() }}
                    className="mobile-signout"
                  >
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <li>
                <button type="button" onClick={openAuthModal} className="mobile-signin">
                  Sign In
                </button>
              </li>
            )}
          </ul>
        </div>

        <style jsx>{`
          .site-header {
            background-color: #000;
            border-bottom: 1px solid #1f2937;
            padding: calc(10px + env(safe-area-inset-top, 0px)) 24px 10px;
            position: sticky;
            top: 0;
            z-index: 50;
          }

          .header-nav {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 24px;
          }

          /* Logo sits at the very left, no grow */
          .header-logo {
            display: flex;
            align-items: center;
            text-decoration: none;
            flex-shrink: 0;
          }

          /* Centre nav takes all remaining space */
          .desktop-nav {
            display: flex;
            align-items: center;
            gap: 20px;
            list-style: none;
            margin: 0;
            padding: 0;
            flex: 1;
          }

          .nav-link {
            color: #fff;
            font-weight: 500;
            text-decoration: none;
            white-space: nowrap;
            font-size: 14px;
          }
          .nav-link:hover { color: #FFBF00; }

          /* Right-side actions — pushed to the far right */
          .desktop-actions {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
            margin-left: auto;
          }

          .btn-discovery {
            background-color: #FFBF00;
            color: #000;
            padding: 10px 18px;
            border-radius: 8px;
            font-weight: 700;
            text-decoration: none;
            white-space: nowrap;
            font-size: 14px;
          }
          .btn-discovery:hover { background-color: #e6ac00; }

          .btn-signin {
            background-color: #fff;
            color: #000;
            padding: 10px 24px;
            border-radius: 8px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            font: inherit;
            font-size: 14px;
            white-space: nowrap;
          }
          .btn-signin:hover { background-color: #e5e5e5; }

          .btn-signout {
            background-color: #EF4444;
            color: #fff;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            font: inherit;
          }

          .admin-link {
            color: #C59A2A;
            font-weight: 600;
            text-decoration: none;
          }

          .user-email {
            color: #D1D5DB;
            font-size: 13px;
          }

          /* Hamburger — hidden on desktop */
          .hamburger {
            display: none;
            min-height: 44px;
            min-width: 44px;
            padding: 10px;
            border: none;
            background: transparent;
            cursor: pointer;
            color: #fff;
            flex-shrink: 0;
            margin-left: auto;
          }

          /* Mobile dropdown */
          .mobile-menu {
            overflow: hidden;
            max-height: 0;
            opacity: 0;
            transition: max-height 0.35s ease, opacity 0.25s ease;
          }
          .mobile-menu.open {
            max-height: 600px;
            opacity: 1;
          }

          .mobile-nav-list {
            list-style: none;
            margin: 0;
            padding: 16px 0 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            border-top: 1px solid #1f2937;
            margin-top: 10px;
          }

          .mobile-nav-link {
            color: #fff;
            font-weight: 500;
            text-decoration: none;
            display: block;
            padding: 12px 16px;
            border-radius: 8px;
          }
          .mobile-nav-link:hover { background: #111; }

          .mobile-discovery {
            background-color: #FFBF00;
            color: #000;
            font-weight: 700;
            text-decoration: none;
            display: block;
            padding: 14px 16px;
            border-radius: 8px;
            text-align: center;
            margin: 4px 0;
          }

          .mobile-admin-link {
            color: #C59A2A;
            font-weight: 600;
            text-decoration: none;
            display: block;
            padding: 12px 16px;
            border-radius: 8px;
          }

          .mobile-email {
            color: #9CA3AF;
            font-size: 13px;
            padding: 8px 16px;
          }

          .mobile-signout {
            background-color: #EF4444;
            color: #fff;
            padding: 14px 16px;
            border-radius: 8px;
            font-weight: 600;
            display: block;
            text-align: center;
            width: 100%;
            border: none;
            cursor: pointer;
            font: inherit;
          }

          .mobile-signin {
            background-color: #fff;
            color: #000;
            padding: 14px 16px;
            border-radius: 8px;
            font-weight: 600;
            display: block;
            text-align: center;
            width: 100%;
            border: none;
            cursor: pointer;
            font: inherit;
          }

          /* ── Responsive ── */
          @media (max-width: 900px) {
            .desktop-nav,
            .desktop-actions {
              display: none !important;
            }
            .hamburger {
              display: flex !important;
              align-items: center;
              justify-content: center;
            }
            .site-header {
              backdrop-filter: saturate(180%) blur(8px);
              background-color: rgba(0, 0, 0, 0.95) !important;
            }
          }
          @media (min-width: 901px) {
            .mobile-menu {
              display: none !important;
            }
          }
        `}</style>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
