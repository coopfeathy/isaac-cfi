'use client'

import { formatDayHeader, TOTAL_ROWS, ROW_HEIGHT_PX } from './calendar-utils'

export interface CalendarDayColumnProps {
  date: Date
  isToday: boolean
  children: React.ReactNode
}

export default function CalendarDayColumn({ date, isToday, children }: CalendarDayColumnProps) {
  const { weekday, dateLabel } = formatDayHeader(date)
  const columnHeight = TOTAL_ROWS * ROW_HEIGHT_PX

  return (
    <div
      className={`flex flex-col border-r border-gray-200 last:border-r-0 min-w-[120px] ${
        isToday ? 'bg-amber-50/40 border-golden/40' : ''
      }`}
    >
      <div
        className={`border-b border-gray-200 px-2 py-2 text-center ${
          isToday ? 'bg-golden/10' : 'bg-gray-50'
        }`}
      >
        <p className="text-xs uppercase tracking-wide text-gray-500">{weekday}</p>
        <p className={`text-sm font-semibold ${isToday ? 'text-golden' : 'text-darkText'}`}>
          {dateLabel}
        </p>
      </div>

      <div className="relative" style={{ height: `${columnHeight}px` }}>
        {Array.from({ length: TOTAL_ROWS }, (_, i) => (
          <div
            key={i}
            className="border-b border-gray-100"
            style={{ height: `${ROW_HEIGHT_PX}px` }}
          />
        ))}
        {children}
      </div>
    </div>
  )
}
