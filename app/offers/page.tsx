'use client'

import { useState, useRef, MouseEvent } from 'react'
import Link from 'next/link'

type Slide = {
  bg: string
  headline: string
  sub: string
  price: string
  cta: { href: string; label: string }
  badge?: string
}

const slides: Slide[] = [
  {
    bg: 'https://images.unsplash.com/photo-1436891678271-9c672565d8f6?w=1200&q=80',
    headline: 'Discovery Flight',
    sub: 'Your first time at the controls. 1 hour in the air.',
    price: 'From $199',
    cta: { href: '/discovery-flight-funnel', label: 'Book Now' },
    badge: '⭐ Best Seller!',
  },
  {
    bg: 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
    headline: 'Private Pilot Certificate',
    sub: 'Full PPL training, start to checkride.',
    price: 'Custom Package',
    cta: { href: '/pricing', label: 'See Pricing' },
  },
  {
    bg: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
    headline: 'Instrument Rating',
    sub: 'Fly in the clouds. Expand your skills.',
    price: 'Add-on to PPL',
    cta: { href: '/pricing', label: 'See Pricing' },
  },
  {
    bg: 'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1200&q=80',
    headline: 'Career Track',
    sub: 'From zero to commercial & CFI.',
    price: 'Full Financing Available',
    cta: { href: '/pricing', label: 'See Pricing' },
  },
]

export default function OffersPage() {
  const [active, setActive] = useState(0)
  const [lightPos, setLightPos] = useState({ x: 80, y: 40 })
  const blockRef = useRef<HTMLDivElement | null>(null)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setLightPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{
        height: '100vh',
        minHeight: '600px',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {slides.map((slide, i) => {
        const isActive = i === active
        return (
          <div
            key={i}
            className="absolute inset-0 transition-all duration-500"
            style={{
              opacity: isActive ? 1 : 0,
              visibility: isActive ? 'visible' : 'hidden',
            }}
            aria-hidden={!isActive}
          >
            {/* Blurred backdrop */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${slide.bg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                filter: 'blur(5px)',
                transform: 'scale(1.05)',
              }}
            />
            {/* Dim overlay */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Centered card */}
            <div className="relative z-10 flex h-full w-full items-center justify-center px-4 py-12 sm:py-16">
              <div
                ref={isActive ? blockRef : null}
                onMouseMove={handleMouseMove}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[10px] p-6 sm:p-8 transition-shadow duration-500"
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  height: '450px',
                  backgroundImage: `url(${slide.bg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundAttachment: 'fixed',
                  boxShadow:
                    '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,191,0,0.15)',
                }}
              >
                {/* Inner dark overlay for readability */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.75) 100%)',
                  }}
                />

                {/* Holographic circle light */}
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-40"
                  style={{
                    background: `radial-gradient(circle at ${lightPos.x}px ${lightPos.y}px, #fff, transparent 45%)`,
                  }}
                />

                {/* Card content */}
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div>
                    {slide.badge && (
                      <span
                        className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: '#FFBF00',
                          color: '#0B0B0B',
                        }}
                      >
                        {slide.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2
                      className="font-bold leading-[1.05] text-white"
                      style={{
                        fontSize: 'clamp(2.25rem, 6vw, 3.25rem)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {slide.headline}
                    </h2>
                    <p className="mt-3 text-[15px] leading-snug text-white/85">
                      {slide.sub}
                    </p>
                    <p
                      className="mt-4 text-base font-semibold"
                      style={{ color: '#FFBF00' }}
                    >
                      {slide.price}
                    </p>
                    <Link
                      href={slide.cta.href}
                      className="mt-5 inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-bold uppercase tracking-wide transition-transform duration-200 hover:scale-[1.03]"
                      style={{
                        backgroundColor: '#FFBF00',
                        color: '#0B0B0B',
                        minHeight: '44px',
                      }}
                    >
                      {slide.cta.label}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Slide label (top, fixed) */}
      <div className="pointer-events-none absolute top-6 left-1/2 z-20 -translate-x-1/2 text-center">
        <p
          className="text-xs uppercase tracking-[0.3em] text-white/70"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
        >
          Flight Training Offers
        </p>
      </div>

      {/* Nav dots */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
        {slides.map((_, i) => {
          const isActive = i === active
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}: ${slides[i].headline}`}
              aria-current={isActive ? 'true' : 'false'}
              className="rounded-full transition-all duration-300"
              style={{
                width: isActive ? '14px' : '10px',
                height: isActive ? '14px' : '10px',
                backgroundColor: isActive ? '#FFBF00' : 'rgba(255,255,255,0.7)',
                border: isActive
                  ? '2px solid rgba(255,255,255,0.9)'
                  : '2px solid transparent',
                minWidth: '44px',
                minHeight: '44px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundClip: 'content-box',
                cursor: 'pointer',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
