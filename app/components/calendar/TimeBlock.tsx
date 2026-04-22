'use client'

import { getTimeBlockPosition, getTimeBlockClasses, type TimeBlockVariant } from './calendar-utils'

export interface TimeBlockProps {
  startMinutes: number
  durationMinutes: number
  variant: TimeBlockVariant
  label?: string
  sublabel?: string
  onClick?: () => void
  interactive?: boolean
}

export default function TimeBlock({
  startMinutes,
  durationMinutes,
  variant,
  label,
  sublabel,
  onClick,
  interactive = false,
}: TimeBlockProps) {
  const { top, height } = getTimeBlockPosition(startMinutes, durationMinutes)
  const variantClasses = getTimeBlockClasses(variant)

  const ariaLabel = [
    label,
    sublabel,
    variant !== 'available' ? variant : undefined,
  ]
    .filter(Boolean)
    .join(' — ')

  return (
    <div
      className={`absolute left-0.5 right-0.5 rounded border px-1.5 py-0.5 text-xs overflow-hidden ${variantClasses} ${
        interactive ? 'cursor-pointer hover:brightness-95 hover:shadow-sm' : ''
      } focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-golden`}
      style={{ top: `${top}px`, height: `${height}px` }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel || undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      {label && <p className="font-medium truncate leading-tight">{label}</p>}
      {sublabel && height > 40 && <p className="truncate leading-tight text-[10px] opacity-80">{sublabel}</p>}
    </div>
  )
}
