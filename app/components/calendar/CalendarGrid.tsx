'use client'

import { generateTimeLabels, TOTAL_ROWS, ROW_HEIGHT_PX } from './calendar-utils'
import CalendarNav from './CalendarNav'

export interface CalendarGridProps {
  weekStart: Date
  onNavigateWeek: (direction: 'prev' | 'next' | 'today') => void
  children: React.ReactNode
  headerLabel?: string
}

const timeLabels = generateTimeLabels()

export default function CalendarGrid({
  weekStart,
  onNavigateWeek,
  children,
  headerLabel,
}: CalendarGridProps) {
  const columnHeight = TOTAL_ROWS * ROW_HEIGHT_PX

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      {headerLabel && (
        <h3 className="text-2xl font-bold text-darkText mb-3">{headerLabel}</h3>
      )}

      <div className="mb-4">
        <CalendarNav weekStart={weekStart} onNavigate={onNavigateWeek} />
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[980px] flex border border-gray-200 rounded-lg">
          {/* Time labels column */}
          <div className="flex-shrink-0 w-[72px] border-r border-gray-200">
            {/* Header spacer */}
            <div className="border-b border-gray-200 bg-gray-50 px-2 py-2 h-[52px]" />
            {/* Time labels */}
            <div className="relative" style={{ height: `${columnHeight}px` }}>
              {timeLabels.map((label, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 px-1.5 text-[11px] text-gray-500 leading-none -translate-y-1/2"
                  style={{ top: `${i * ROW_HEIGHT_PX}px` }}
                >
                  {label.display}
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          <div className="flex flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
