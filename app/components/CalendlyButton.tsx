/**
 * DEPRECATED — Calendly has been removed from Merlin Flight Training.
 *
 * Scheduling is now handled by our own in-house, Apple Calendar–style
 * week-view picker at `/book-lesson`. This file only exists as a thin
 * compatibility shim in case any old imports still reference it — the
 * exports below silently route the user to the new scheduler so nothing
 * crashes in a stale build.
 *
 * Safe to delete this file once you've confirmed nothing imports from
 * `@/app/components/CalendlyButton` anywhere in the codebase.
 */
'use client'

import Link from 'next/link'

const BOOK_LESSON_URL = '/book-lesson'

/** No-op hook kept for backwards compatibility. */
export function useCalendly(): void {
  // intentionally empty — no third-party script to load anymore
}

/** Opens our in-house scheduler in the current tab. */
export function openCalendly(): void {
  if (typeof window !== 'undefined') {
    window.location.href = BOOK_LESSON_URL
  }
}

interface CalendlyButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
}

/**
 * Renders a link to the in-house scheduler. Kept named `CalendlyButton`
 * purely so legacy imports keep type-checking; new code should use a
 * plain `<Link href="/book-lesson">` instead.
 */
export default function CalendlyButton({
  children,
  className = '',
  variant = 'primary',
}: CalendlyButtonProps) {
  const baseStyles =
    'font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 cursor-pointer inline-flex items-center justify-center'

  const variantStyles = {
    primary: 'bg-golden text-black hover:bg-yellow-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-black text-white hover:bg-golden hover:text-black shadow-lg hover:shadow-xl',
    outline:
      'bg-transparent text-white border-2 border-white/30 hover:border-golden hover:bg-white/10 backdrop-blur-sm',
  }

  return (
    <Link href={BOOK_LESSON_URL} className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </Link>
  )
}

/** Provider shim — used to inject Calendly scripts; now a pass-through. */
export function CalendlyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
