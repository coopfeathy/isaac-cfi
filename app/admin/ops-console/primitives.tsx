'use client'

import type { ReactNode } from 'react'

// Inline SVG icon set, ported from the design prototype.
export function I({ name, size = 12 }: { name: string; size?: number }) {
  const s = size
  const c = {
    width: s,
    height: s,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'chev-r': return <svg {...c}><polyline points="6,3 11,8 6,13" /></svg>
    case 'chev-d': return <svg {...c}><polyline points="3,6 8,11 13,6" /></svg>
    case 'chev-l': return <svg {...c}><polyline points="10,3 5,8 10,13" /></svg>
    case 'dot':    return <svg {...c}><circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" /></svg>
    case 'square': return <svg {...c}><rect x="3.5" y="3.5" width="9" height="9" rx="1.5" /></svg>
    case 'plane':  return <svg {...c}><path d="M8 2 L9 7 L14 9 L9 10 L8 14 L7 10 L2 9 L7 7 Z" /></svg>
    case 'user':   return <svg {...c}><circle cx="8" cy="6" r="2.5" /><path d="M3.5 13.5 C4.5 10.5 11.5 10.5 12.5 13.5" /></svg>
    case 'cal':    return <svg {...c}><rect x="2.5" y="3.5" width="11" height="10" rx="1" /><line x1="2.5" y1="6.5" x2="13.5" y2="6.5" /></svg>
    case 'book':   return <svg {...c}><path d="M3 3.5 C5 3 7 3 8 4 C9 3 11 3 13 3.5 L13 12.5 C11 12 9 12 8 13 C7 12 5 12 3 12.5 Z" /></svg>
    case 'search': return <svg {...c}><circle cx="7" cy="7" r="4" /><line x1="10" y1="10" x2="13" y2="13" /></svg>
    case 'filter': return <svg {...c}><path d="M2.5 3.5 L13.5 3.5 L9.5 8.5 L9.5 13 L6.5 11.5 L6.5 8.5 Z" /></svg>
    case 'alert':  return <svg {...c}><path d="M8 2 L14 13 L2 13 Z" /><line x1="8" y1="6.5" x2="8" y2="9.5" /><circle cx="8" cy="11.5" r="0.4" fill="currentColor" stroke="none" /></svg>
    case 'info':   return <svg {...c}><circle cx="8" cy="8" r="5.5" /><line x1="8" y1="7" x2="8" y2="11" /><circle cx="8" cy="5" r="0.4" fill="currentColor" stroke="none" /></svg>
    case 'x-oct':  return <svg {...c}><circle cx="8" cy="8" r="5.5" /><line x1="6" y1="6" x2="10" y2="10" /><line x1="10" y1="6" x2="6" y2="10" /></svg>
    case 'check':  return <svg {...c}><polyline points="3,8.5 7,12 13,4.5" /></svg>
    case 'zoom-in':  return <svg {...c}><circle cx="7" cy="7" r="4" /><line x1="10" y1="10" x2="13" y2="13" /><line x1="5" y1="7" x2="9" y2="7" /><line x1="7" y1="5" x2="7" y2="9" /></svg>
    case 'zoom-out': return <svg {...c}><circle cx="7" cy="7" r="4" /><line x1="10" y1="10" x2="13" y2="13" /><line x1="5" y1="7" x2="9" y2="7" /></svg>
    case 'refresh':  return <svg {...c}><path d="M13 8 A5 5 0 1 1 11.5 4.5" /><polyline points="13,2 13,5 10,5" /></svg>
    case 'settings': return <svg {...c}><circle cx="8" cy="8" r="2" /><path d="M8 2 L8 4 M8 12 L8 14 M2 8 L4 8 M12 8 L14 8 M3.5 3.5 L5 5 M11 11 L12.5 12.5 M3.5 12.5 L5 11 M11 5 L12.5 3.5" /></svg>
    case 'bell':     return <svg {...c}><path d="M4 11 L4 8 A4 4 0 0 1 12 8 L12 11 L13 12 L3 12 Z" /><path d="M6.5 12 A1.5 1.5 0 0 0 9.5 12" /></svg>
    case 'lock':     return <svg {...c}><rect x="3.5" y="7.5" width="9" height="6" rx="1" /><path d="M5.5 7.5 L5.5 5.5 A2.5 2.5 0 0 1 10.5 5.5 L10.5 7.5" /></svg>
    case 'home':     return <svg {...c}><path d="M2.5 8 L8 3 L13.5 8 L13.5 13 L9.5 13 L9.5 9.5 L6.5 9.5 L6.5 13 L2.5 13 Z" /></svg>
    case 'users':    return <svg {...c}><circle cx="6" cy="6" r="2" /><circle cx="11" cy="7" r="1.5" /><path d="M2 13 C2.5 10 9.5 10 10 13" /><path d="M10 13 C10.5 11.5 13.5 11.5 14 13" /></svg>
    case 'wallet':   return <svg {...c}><rect x="2" y="4" width="12" height="9" rx="1.5" /><path d="M2 7 L14 7" /><circle cx="11.5" cy="10" r="0.6" fill="currentColor" stroke="none" /></svg>
    case 'plus':     return <svg {...c}><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>
    case 'more':     return <svg {...c}><circle cx="4" cy="8" r="0.8" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" /><circle cx="12" cy="8" r="0.8" fill="currentColor" stroke="none" /></svg>
    case 'sun':      return <svg {...c}><circle cx="8" cy="8" r="3" /><line x1="8" y1="2" x2="8" y2="4" /><line x1="8" y1="12" x2="8" y2="14" /><line x1="2" y1="8" x2="4" y2="8" /><line x1="12" y1="8" x2="14" y2="8" /><line x1="3.5" y1="3.5" x2="5" y2="5" /><line x1="11" y1="11" x2="12.5" y2="12.5" /><line x1="3.5" y1="12.5" x2="5" y2="11" /><line x1="11" y1="5" x2="12.5" y2="3.5" /></svg>
    case 'moon':     return <svg {...c}><path d="M13 9 A5 5 0 1 1 7 3 A4 4 0 0 0 13 9 Z" /></svg>
    default: return null
  }
}

export function Badge({ kind = 'muted', children }: { kind?: string; children: ReactNode }) {
  return <span className={`badge badge-${kind}`}>{children}</span>
}

type CfiLike = { initials: string; color: string } | null | undefined
export function Avatar({ cfi, size }: { cfi: CfiLike; size?: number }) {
  const style = size ? { width: size, height: size, fontSize: size * 0.4 } : undefined
  if (!cfi) return <span className="avatar avatar-empty" style={style}>—</span>
  return <span className={`avatar avatar-${cfi.color}`} style={style}>{cfi.initials}</span>
}

export function StatusLights() {
  return (
    <div className="status-lights" title="System health">
      <span className="sl sl-green" title="All services healthy" />
      <span className="sl sl-amber" title="2 webhook retries" />
      <span className="sl sl-red" title="1 AOG aircraft" />
    </div>
  )
}
