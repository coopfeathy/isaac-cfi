'use client'

import { useEffect } from 'react'

// Calendly URL - update this if the URL changes
const CALENDLY_URL = 'https://calendly.com/merlinflighttraining'

// Declare Calendly on window for TypeScript
declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void
    }
  }
}

// Hook to load Calendly scripts
export function useCalendly() {
  useEffect(() => {
    // Check if scripts are already loaded
    if (document.querySelector('link[href*="calendly"]')) {
      return
    }

    // Load Calendly CSS
    const link = document.createElement('link')
    link.href = 'https://assets.calendly.com/assets/external/widget.css'
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    // Load Calendly JS
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      // Cleanup on unmount (optional, usually not needed)
    }
  }, [])
}

// Function to open Calendly popup
export function openCalendly() {
  if (typeof window !== 'undefined' && window.Calendly) {
    window.Calendly.initPopupWidget({ url: CALENDLY_URL })
  } else {
    // Fallback: open in new tab if widget isn't loaded
    window.open(CALENDLY_URL, '_blank')
  }
}

// Calendly Button Component
interface CalendlyButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
}

export default function CalendlyButton({ 
  children, 
  className = '',
  variant = 'primary' 
}: CalendlyButtonProps) {
  useCalendly()

  const baseStyles = 'font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 cursor-pointer'
  
  const variantStyles = {
    primary: 'bg-golden text-black hover:bg-yellow-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-black text-white hover:bg-golden hover:text-black shadow-lg hover:shadow-xl',
    outline: 'bg-transparent text-white border-2 border-white/30 hover:border-golden hover:bg-white/10 backdrop-blur-sm',
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        openCalendly()
      }}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// Provider component to load Calendly scripts once at the app level
export function CalendlyProvider({ children }: { children: React.ReactNode }) {
  useCalendly()
  return <>{children}</>
}
