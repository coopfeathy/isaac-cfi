'use client'

import { formatWeekLabel } from './calendar-utils'

export interface CalendarNavProps {
  weekStart: Date
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
}

export default function CalendarNav({ weekStart, onNavigate }: CalendarNavProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-medium text-darkText rounded-lg border border-golden/30 bg-amber-50 px-4 py-2 text-amber-900">
        {formatWeekLabel(weekStart)}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-golden"
          onClick={() => onNavigate('prev')}
          aria-label="Previous week"
        >
          ← Prev
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-golden"
          onClick={() => onNavigate('today')}
        >
          This Week
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-golden"
          onClick={() => onNavigate('next')}
          aria-label="Next week"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
