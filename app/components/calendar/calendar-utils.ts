export const START_HOUR = 6
export const END_HOUR = 21
export const HALF_HOUR = 30
export const ROW_HEIGHT_PX = 32
export const TOTAL_ROWS = ((END_HOUR - START_HOUR) * 60) / HALF_HOUR

export type TimeBlockVariant = 'available' | 'busy' | 'pending' | 'approved' | 'denied' | 'blocked'

export function getTimeBlockPosition(startMinutes: number, durationMinutes: number): { top: number; height: number } {
  const top = (startMinutes / HALF_HOUR) * ROW_HEIGHT_PX
  const rawHeight = (durationMinutes / HALF_HOUR) * ROW_HEIGHT_PX
  const height = Math.max(rawHeight, ROW_HEIGHT_PX)
  return { top, height }
}

const VARIANT_CLASSES: Record<TimeBlockVariant, string> = {
  available: 'bg-emerald-100 border-emerald-400 text-emerald-900',
  busy: 'bg-gray-200 border-gray-300 text-gray-600',
  pending: 'bg-amber-100 border-amber-400 text-amber-900',
  approved: 'bg-blue-100 border-blue-400 text-blue-900',
  denied: 'bg-red-50 border-red-300 text-red-800',
  blocked: 'bg-gray-300 border-gray-400 text-gray-700',
}

export function getTimeBlockClasses(variant: TimeBlockVariant): string {
  return VARIANT_CLASSES[variant]
}

export function formatWeekLabel(weekStart: Date): string {
  const month = weekStart.toLocaleDateString('en-US', { month: 'long' })
  const day = weekStart.getDate()
  const year = weekStart.getFullYear()
  return `Week of ${month} ${day}, ${year}`
}

export interface TimeLabel {
  hour: number
  minute: number
  display: string
}

export function generateTimeLabels(): TimeLabel[] {
  const labels: TimeLabel[] = []
  for (let i = 0; i < TOTAL_ROWS; i++) {
    const totalMinutes = START_HOUR * 60 + i * HALF_HOUR
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    const d = new Date()
    d.setHours(hour, minute, 0, 0)
    const display = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    labels.push({ hour, minute, display })
  }
  return labels
}

export function formatDayHeader(date: Date): { weekday: string; dateLabel: string } {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { weekday, dateLabel }
}
