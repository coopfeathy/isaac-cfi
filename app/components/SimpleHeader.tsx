"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import AuthModal from "./AuthModal"

function FingerprintSignIn({ onClick }: { onClick: () => void }) {
  const [active, setActive] = useState(false)

  const handleMouseEnter = () => {
    if (!active) setActive(true)
  }

  const handleAnimationEnd = () => {
    setActive(false)
  }

  return (
    <>
      <div
        className={`fp-container${active ? ' fp-active' : ''}`}
        onMouseEnter={handleMouseEnter}
        onAnimationEnd={handleAnimationEnd}
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        <span className="fp-label">SIGN IN</span>
        {/* Base fingerprint (gray) */}
        <svg className="fp-svg fp-svg-base" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path className="odd" d="M 31.1 4 C 31.7 4 32.3 4 32.9 4" />
          <path className="even" d="M 38.1 5.5 C 41.9 7 45.3 9.5 47.9 12.8" />
          <path className="odd" d="M 50.5 18 C 52.1 21.7 52.8 25.9 52.4 30.1 C 52.1 32.8 51.5 35.4 51.1 38.1" />
          <path className="even" d="M 50.2 44.3 C 49.5 46.5 48.5 48.6 46.9 50.3" />
          <path className="odd" d="M 43.2 53.7 C 41 55.2 38.5 56.1 35.9 56.4" />
          <path className="even" d="M 29.7 56.1 C 27.2 55.5 24.9 54.3 23 52.5" />
          <path className="odd" d="M 19.6 49.1 C 18.2 47 17.5 44.5 17.5 42" />
          <path className="even" d="M 18 35.9 C 18.5 33.5 19.1 31.1 19.4 28.7 C 20.4 21.2 27.1 15.8 34.7 16.4 C 41.1 16.9 46.3 22 47.1 28.3 C 47.6 32.3 46.8 36.2 46.2 40.2" />
          <path className="odd" d="M 44.6 46.2 C 43.3 49.3 40.8 51.7 37.6 52.8 C 31.2 55 24.3 51.3 23 44.8 C 22.5 42.4 22.9 39.9 23.3 37.5 C 23.8 34.7 24.5 31.9 24.7 29.1 C 25.2 24 29.9 20.3 35 20.8 C 39.4 21.2 42.8 24.8 43 29.3 C 43.1 31.6 42.6 33.9 42.2 36.2" />
          <path className="even" d="M 41 42 C 39.6 45.9 36 48.6 31.9 48.8 C 26.3 49.1 21.6 44.6 21.8 39 C 21.9 36.7 22.6 34.4 23 32.1 C 23.5 29.5 23.8 26.7 22.8 24.2" />
          <path className="odd" d="M 20.3 20.3 C 17.1 17.4 12.4 16.8 8.6 19 C 5.1 21 3 24.8 3.1 28.8 C 3.2 32.7 2.6 36.7 3 40.6 C 4 49.7 11.1 57 20.2 58.2" />
          <path className="even" d="M 26.4 59.7 C 29.3 60.3 32.3 60.3 35.2 59.8" />
          <path className="odd" d="M 41.2 58 C 46.9 55.6 51.4 51 53.7 45.2" />
          <path className="even" d="M 55.5 39 C 56.2 36.1 56.5 33.1 56.5 30.1 C 56.4 18.4 49.4 7.8 38.7 3.4" />
          <path className="odd" d="M 32.5 2 C 31.9 2 31.3 2 30.7 2.1 C 19.8 2.8 10.3 9.5 6 19.5" />
          <path className="even" d="M 27.8 25.4 C 25.6 26.9 24.2 29.4 24.1 32" />
          <path className="odd" d="M 25.1 38.1 C 25.5 40.8 27.5 43.1 30.2 44 C 33.9 45.3 37.9 43.3 39.2 39.6 C 39.8 37.9 39.7 36 39.4 34.2 C 38.9 31.5 38.1 28.9 38.5 26.2" />
          <path className="even" d="M 40.4 23.3 C 42.4 22.2 44.8 22.1 46.9 23.2" />
        </svg>
        {/* Active fingerprint (white) */}
        <svg className="fp-svg fp-svg-active" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path className="odd" d="M 31.1 4 C 31.7 4 32.3 4 32.9 4" />
          <path className="even" d="M 38.1 5.5 C 41.9 7 45.3 9.5 47.9 12.8" />
          <path className="odd" d="M 50.5 18 C 52.1 21.7 52.8 25.9 52.4 30.1 C 52.1 32.8 51.5 35.4 51.1 38.1" />
          <path className="even" d="M 50.2 44.3 C 49.5 46.5 48.5 48.6 46.9 50.3" />
          <path className="odd" d="M 43.2 53.7 C 41 55.2 38.5 56.1 35.9 56.4" />
          <path className="even" d="M 29.7 56.1 C 27.2 55.5 24.9 54.3 23 52.5" />
          <path className="odd" d="M 19.6 49.1 C 18.2 47 17.5 44.5 17.5 42" />
          <path className="even" d="M 18 35.9 C 18.5 33.5 19.1 31.1 19.4 28.7 C 20.4 21.2 27.1 15.8 34.7 16.4 C 41.1 16.9 46.3 22 47.1 28.3 C 47.6 32.3 46.8 36.2 46.2 40.2" />
          <path className="odd" d="M 44.6 46.2 C 43.3 49.3 40.8 51.7 37.6 52.8 C 31.2 55 24.3 51.3 23 44.8 C 22.5 42.4 22.9 39.9 23.3 37.5 C 23.8 34.7 24.5 31.9 24.7 29.1 C 25.2 24 29.9 20.3 35 20.8 C 39.4 21.2 42.8 24.8 43 29.3 C 43.1 31.6 42.6 33.9 42.2 36.2" />
          <path className="even" d="M 41 42 C 39.6 45.9 36 48.6 31.9 48.8 C 26.3 49.1 21.6 44.6 21.8 39 C 21.9 36.7 22.6 34.4 23 32.1 C 23.5 29.5 23.8 26.7 22.8 24.2" />
          <path className="odd" d="M 20.3 20.3 C 17.1 17.4 12.4 16.8 8.6 19 C 5.1 21 3 24.8 3.1 28.8 C 3.2 32.7 2.6 36.7 3 40.6 C 4 49.7 11.1 57 20.2 58.2" />
          <path className="even" d="M 26.4 59.7 C 29.3 60.3 32.3 60.3 35.2 59.8" />
          <path className="odd" d="M 41.2 58 C 46.9 55.6 51.4 51 53.7 45.2" />
          <path className="even" d="M 55.5 39 C 56.2 36.1 56.5 33.1 56.5 30.1 C 56.4 18.4 49.4 7.8 38.7 3.4" />
          <path className="odd" d="M 32.5 2 C 31.9 2 31.3 2 30.7 2.1 C 19.8 2.8 10.3 9.5 6 19.5" />
          <path className="even" d="M 27.8 25.4 C 25.6 26.9 24.2 29.4 24.1 32" />
          <path className="odd" d="M 25.1 38.1 C 25.5 40.8 27.5 43.1 30.2 44 C 33.9 45.3 37.9 43.3 39.2 39.6 C 39.8 37.9 39.7 36 39.4 34.2 C 38.9 31.5 38.1 28.9 38.5 26.2" />
          <path className="even" d="M 40.4 23.3 C 42.4 22.2 44.8 22.1 46.9 23.2" />
        </svg>
        {/* Checkmark */}
        <svg className="fp-ok" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <polyline points="16,34 28,46 48,22" />
        </svg>
      </div>
      <style jsx>{`
        .fp-container {
          position: relative;
          width: 120px;
          height: 44px;
          border-radius: 8px;
          background: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .fp-container.fp-active {
          animation: 2.8s fpContainer forwards;
        }
        @keyframes fpContainer {
          0%   { width: 120px; border-radius: 8px; background: #ffffff; }
          15%  { width: 44px; border-radius: 22px; background: #111111; }
          75%  { width: 44px; border-radius: 22px; background: #111111; }
          90%  { width: 120px; border-radius: 8px; background: #ffffff; }
          100% { width: 120px; border-radius: 8px; background: #ffffff; }
        }
        .fp-label {
          position: absolute;
          color: #000000;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
          font-family: inherit;
        }
        .fp-active .fp-label {
          animation: 2.8s fpLabel forwards;
        }
        @keyframes fpLabel {
          0%   { opacity: 1; }
          10%  { opacity: 0; }
          80%  { opacity: 0; }
          100% { opacity: 1; }
        }
        .fp-svg {
          position: absolute;
          width: 44px;
          height: 44px;
          fill: none;
          stroke-width: 2.5;
          stroke-linecap: round;
          opacity: 0;
        }
        .fp-svg path {
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
        }
        .fp-svg-base { stroke: #666; }
        .fp-svg-active { stroke: #ffffff; }
        .fp-active .fp-svg-base {
          animation: 2.8s fpSvgBase forwards;
        }
        .fp-active .fp-svg-active {
          animation: 2.8s fpSvgActive forwards;
        }
        @keyframes fpSvgBase {
          0%   { opacity: 0; }
          12%  { opacity: 1; }
          40%  { opacity: 1; }
          52%  { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes fpSvgActive {
          0%   { opacity: 0; }
          40%  { opacity: 0; }
          52%  { opacity: 1; }
          70%  { opacity: 1; }
          82%  { opacity: 0; }
          100% { opacity: 0; }
        }
        /* Stagger the path draws */
        .fp-active .fp-svg path.odd {
          animation: 1s fpDraw 0.3s forwards;
        }
        .fp-active .fp-svg path.even {
          animation: 1s fpDraw 0.5s forwards;
        }
        @keyframes fpDraw {
          to { stroke-dashoffset: 0; }
        }
        .fp-ok {
          position: absolute;
          width: 36px;
          height: 36px;
          fill: none;
          stroke: #FFBF00;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          opacity: 0;
        }
        .fp-active .fp-ok {
          animation: 2.8s fpOk forwards;
        }
        @keyframes fpOk {
          0%   { opacity: 0; stroke-dashoffset: 60; }
          65%  { opacity: 0; stroke-dashoffset: 60; }
          72%  { opacity: 1; stroke-dashoffset: 60; }
          80%  { opacity: 1; stroke-dashoffset: 0; }
          88%  { opacity: 0; stroke-dashoffset: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  )
}

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
      <header style={{
        backgroundColor: '#000000',
        borderBottom: '1px solid #1f2937',
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
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* Logo — far left */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', justifyContent: 'flex-start' }}>
            <Image
              src="/merlin-logo-white-textonly.png"
              alt="Merlin Flight Training"
              width={325}
              height={100}
              style={{ height: 'auto', maxHeight: '60px', width: 'auto' }}
              priority
            />
          </Link>

          {/* Desktop nav links — center */}
          <ul style={{
            display: 'flex',
            gap: '20px',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            alignItems: 'center',
          }}
          className="desktop-nav"
          >
            {primaryNavLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} style={{ color: '#ffffff', fontWeight: 500, textDecoration: 'none' }}>
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
          </ul>

          {/* Right column — sign in on desktop, hamburger on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {/* Desktop auth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="desktop-auth">
              {user ? (
                <>
                  {isAdmin && (
                    <Link href="https://app.merlinflighttraining.com/admin" style={{ color: '#C59A2A', fontWeight: 600, textDecoration: 'none' }}>
                      Admin
                    </Link>
                  )}
                  <span style={{ color: '#D1D5DB', fontSize: '14px' }}>{user.email}</span>
                  <button
                    onClick={handleSignOut}
                    style={{
                      backgroundColor: '#EF4444',
                      color: '#fff',
                      padding: '10px 30px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <FingerprintSignIn onClick={openAuthModal} />
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="mobile-menu-btn"
              style={{
                display: 'none',
                minHeight: '44px',
                minWidth: '44px',
                padding: '10px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#ffffff',
              }}
            >
              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div style={{
            marginTop: '20px',
            paddingTop: '12px',
            borderTop: '1px solid #1f2937'
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
                      color: '#ffffff',
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
                        href="https://app.merlinflighttraining.com/admin"
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
                    color: '#D1D5DB',
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
                  <button
                    type="button"
                    onClick={openAuthModal}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#000000',
                      padding: '14px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      display: 'block',
                      textAlign: 'center',
                      width: '100%',
                      border: 'none',
                      cursor: 'pointer',
                      font: 'inherit',
                    }}
                  >
                    Sign In
                  </button>
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
            .desktop-auth {
              display: none !important;
            }
            .mobile-menu-btn {
              display: block !important;
            }
            header {
              backdrop-filter: saturate(180%) blur(8px);
              background-color: rgba(0, 0, 0, 0.95) !important;
            }
          }
          @media (min-width: 901px) {
            .mobile-nav {
              display: none !important;
            }
          }
        `}</style>
      </header>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
