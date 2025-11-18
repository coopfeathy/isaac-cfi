"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"

export default function SimpleHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
            <li>
              <Link href="/" style={{ color: '#374151', fontWeight: 500, textDecoration: 'none' }}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/schedule" style={{ color: '#374151', fontWeight: 500, textDecoration: 'none' }}>
                Schedule
              </Link>
            </li>
            <li>
              <Link href="/aircraft" style={{ color: '#374151', fontWeight: 500, textDecoration: 'none' }}>
                Aircraft
              </Link>
            </li>
            <li>
              <Link href="/blog" style={{ color: '#374151', fontWeight: 500, textDecoration: 'none' }}>
                Blog
              </Link>
            </li>
            <li>
              <Link href="/faq" style={{ color: '#374151', fontWeight: 500, textDecoration: 'none' }}>
                FAQ
              </Link>
            </li>
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
              gap: '10px'
            }}>
              <li>
                <Link 
                  href="/" 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ 
                    color: '#374151', 
                    fontWeight: 500, 
                    textDecoration: 'none',
                    display: 'block',
                    padding: '12px 16px',
                    borderRadius: '8px'
                  }}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  href="/schedule" 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ 
                    color: '#374151', 
                    fontWeight: 500, 
                    textDecoration: 'none',
                    display: 'block',
                    padding: '12px 16px',
                    borderRadius: '8px'
                  }}
                >
                  Schedule
                </Link>
              </li>
              <li>
                <Link 
                  href="/aircraft" 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ 
                    color: '#374151', 
                    fontWeight: 500, 
                    textDecoration: 'none',
                    display: 'block',
                    padding: '12px 16px',
                    borderRadius: '8px'
                  }}
                >
                  Aircraft
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ 
                    color: '#374151', 
                    fontWeight: 500, 
                    textDecoration: 'none',
                    display: 'block',
                    padding: '12px 16px',
                    borderRadius: '8px'
                  }}
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq" 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ 
                    color: '#374151', 
                    fontWeight: 500, 
                    textDecoration: 'none',
                    display: 'block',
                    padding: '12px 16px',
                    borderRadius: '8px'
                  }}
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ 
                    backgroundColor: '#000', 
                    color: '#fff', 
                    padding: '12px 16px', 
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
