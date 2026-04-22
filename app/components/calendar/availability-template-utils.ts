import type { InstructorAvailability } from '@/lib/types/calendar'

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export interface TimeOption {
  label: string
  value: string
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function generateTimeOptions(): TimeOption[] {
  const options: TimeOption[] = []
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 22 && m > 0) break
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      options.push({ label: formatTimeDisplay(value), value })
    }
  }
  return options
}

export function validateTimeRange(start: string, end: string): string | null {
  if (parseTimeToMinutes(start) >= parseTimeToMinutes(end)) {
    return 'Start time must be before end time'
  }
  return null
}

export function checkOverlap(
  entries: InstructorAvailability[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string,
): boolean {
  const newStart = parseTimeToMinutes(startTime)
  const newEnd = parseTimeToMinutes(endTime)

  return entries.some((entry) => {
    if (entry.day_of_week !== dayOfWeek) return false
    if (excludeId && entry.id === excludeId) return false
    const existStart = parseTimeToMinutes(entry.start_time)
    const existEnd = parseTimeToMinutes(entry.end_time)
    return newStart < existEnd && newEnd > existStart
  })
}
