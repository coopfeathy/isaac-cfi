import { computeAvailabilityFromData } from '@/lib/availability-engine'
import type { AvailableSlot } from '@/lib/types/calendar'

// Helper: convert "YYYY-MM-DD HH:MM" in America/New_York to UTC ISO string
function nyToUTC(dateStr: string, time: string): string {
  const dt = new Date(`${dateStr}T${time}:00-04:00`) // EDT offset
  return dt.toISOString()
}

// Week of 2025-06-16 (Monday) through 2025-06-22 (Sunday) — EDT (-04:00)
const WEEK_START = '2025-06-16'

describe('computeAvailabilityFromData', () => {
  it('1. empty template returns empty availability', () => {
    const result = computeAvailabilityFromData(WEEK_START, [], [], [])
    expect(result).toEqual([])
  })

  it('2. template with no bookings returns full availability', () => {
    // Monday = day_of_week 1 (0=Sun in JS, but our DB uses 0=Sun, 1=Mon)
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], [])

    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2025-06-16')
    // 08:00 EDT = 12:00 UTC, 16:00 EDT = 20:00 UTC
    expect(result[0].start).toBe('2025-06-16T12:00:00.000Z')
    expect(result[0].end).toBe('2025-06-16T20:00:00.000Z')
  })

  it('3. override blocks a whole day', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
      { day_of_week: 2, start_time: '08:00', end_time: '16:00' },
    ]
    const overrides = [
      { override_date: '2025-06-16', is_available: false, start_time: null, end_time: null },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, overrides, [])

    // Monday blocked, only Tuesday remains
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2025-06-17')
  })

  it('4. override adds extra hours on a day with no template', () => {
    // Saturday = day_of_week 6, no template for Saturday
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
    ]
    const overrides = [
      { override_date: '2025-06-21', is_available: true, start_time: '10:00', end_time: '14:00' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, overrides, [])

    expect(result).toHaveLength(2)
    // Monday template
    const monday = result.find((s: AvailableSlot) => s.date === '2025-06-16')
    expect(monday).toBeDefined()
    // Saturday override
    const saturday = result.find((s: AvailableSlot) => s.date === '2025-06-21')
    expect(saturday).toBeDefined()
    expect(saturday!.start).toBe('2025-06-21T14:00:00.000Z') // 10:00 EDT = 14:00 UTC
    expect(saturday!.end).toBe('2025-06-21T18:00:00.000Z')   // 14:00 EDT = 18:00 UTC
  })

  it('5. booking in the middle of a range splits it', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
    ]
    // Busy from 10:00-12:00 EDT (14:00-16:00 UTC)
    const busySlots = [
      { start_time: '2025-06-16T14:00:00.000Z', end_time: '2025-06-16T16:00:00.000Z' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], busySlots)

    expect(result).toHaveLength(2)
    // 08:00-10:00 EDT
    expect(result[0].start).toBe('2025-06-16T12:00:00.000Z')
    expect(result[0].end).toBe('2025-06-16T14:00:00.000Z')
    // 12:00-16:00 EDT
    expect(result[1].start).toBe('2025-06-16T16:00:00.000Z')
    expect(result[1].end).toBe('2025-06-16T20:00:00.000Z')
  })

  it('6. multiple bookings fragment a range', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
    ]
    const busySlots = [
      // 09:00-10:00 EDT
      { start_time: '2025-06-16T13:00:00.000Z', end_time: '2025-06-16T14:00:00.000Z' },
      // 12:00-13:00 EDT
      { start_time: '2025-06-16T16:00:00.000Z', end_time: '2025-06-16T17:00:00.000Z' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], busySlots)

    expect(result).toHaveLength(3)
    // 08:00-09:00 EDT
    expect(result[0].start).toBe('2025-06-16T12:00:00.000Z')
    expect(result[0].end).toBe('2025-06-16T13:00:00.000Z')
    // 10:00-12:00 EDT
    expect(result[1].start).toBe('2025-06-16T14:00:00.000Z')
    expect(result[1].end).toBe('2025-06-16T16:00:00.000Z')
    // 13:00-16:00 EDT
    expect(result[2].start).toBe('2025-06-16T17:00:00.000Z')
    expect(result[2].end).toBe('2025-06-16T20:00:00.000Z')
  })

  it('7. booking at start of range truncates it', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
    ]
    // Busy 08:00-10:00 EDT
    const busySlots = [
      { start_time: '2025-06-16T12:00:00.000Z', end_time: '2025-06-16T14:00:00.000Z' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], busySlots)

    expect(result).toHaveLength(1)
    expect(result[0].start).toBe('2025-06-16T14:00:00.000Z') // 10:00 EDT
    expect(result[0].end).toBe('2025-06-16T20:00:00.000Z')   // 16:00 EDT
  })

  it('8. booking at end of range truncates it', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
    ]
    // Busy 14:00-16:00 EDT (18:00-20:00 UTC)
    const busySlots = [
      { start_time: '2025-06-16T18:00:00.000Z', end_time: '2025-06-16T20:00:00.000Z' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], busySlots)

    expect(result).toHaveLength(1)
    expect(result[0].start).toBe('2025-06-16T12:00:00.000Z') // 08:00 EDT
    expect(result[0].end).toBe('2025-06-16T18:00:00.000Z')   // 14:00 EDT
  })

  it('9. booking consuming entire range removes it', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
    ]
    // Busy covers entire 08:00-16:00 EDT
    const busySlots = [
      { start_time: '2025-06-16T12:00:00.000Z', end_time: '2025-06-16T20:00:00.000Z' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], busySlots)

    expect(result).toHaveLength(0)
  })

  it('10. slot duration filter removes ranges shorter than minimum', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
    ]
    // Busy 09:00-15:00 EDT → leaves 08:00-09:00 (60min) and 15:00-16:00 (60min)
    const busySlots = [
      { start_time: '2025-06-16T13:00:00.000Z', end_time: '2025-06-16T19:00:00.000Z' },
    ]
    // With 120min minimum, both 60min fragments should be filtered out
    const result = computeAvailabilityFromData(WEEK_START, template, [], busySlots, 120)
    expect(result).toHaveLength(0)

    // With 60min minimum, both should pass
    const result60 = computeAvailabilityFromData(WEEK_START, template, [], busySlots, 60)
    expect(result60).toHaveLength(2)
  })

  it('11. template across midnight is handled gracefully', () => {
    // If someone enters 22:00-02:00, we clamp end_time to midnight
    const template = [
      { day_of_week: 1, start_time: '22:00', end_time: '02:00' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], [])

    // Should either produce a range 22:00-23:59 or be empty — not crash
    // We'll treat end < start as end_time wraps to midnight (24:00)
    expect(result.length).toBeLessThanOrEqual(1)
    if (result.length === 1) {
      expect(result[0].date).toBe('2025-06-16')
      // 22:00 EDT = 02:00 UTC next day
      expect(new Date(result[0].start).getTime()).toBeLessThan(new Date(result[0].end).getTime())
    }
  })

  it('12. multiple template ranges on same day are merged correctly', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '12:00' },
      { day_of_week: 1, start_time: '13:00', end_time: '17:00' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], [])

    expect(result).toHaveLength(2)
    expect(result[0].start).toBe('2025-06-16T12:00:00.000Z') // 08:00 EDT
    expect(result[0].end).toBe('2025-06-16T16:00:00.000Z')   // 12:00 EDT
    expect(result[1].start).toBe('2025-06-16T17:00:00.000Z') // 13:00 EDT
    expect(result[1].end).toBe('2025-06-16T21:00:00.000Z')   // 17:00 EDT
  })

  it('13. override adds hours to a day that already has template', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '12:00' },
    ]
    const overrides = [
      { override_date: '2025-06-16', is_available: true, start_time: '14:00', end_time: '18:00' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, overrides, [])

    expect(result).toHaveLength(2)
    // Template range
    expect(result[0].start).toBe('2025-06-16T12:00:00.000Z') // 08:00 EDT
    expect(result[0].end).toBe('2025-06-16T16:00:00.000Z')   // 12:00 EDT
    // Override range
    expect(result[1].start).toBe('2025-06-16T18:00:00.000Z') // 14:00 EDT
    expect(result[1].end).toBe('2025-06-16T22:00:00.000Z')   // 18:00 EDT
  })

  it('14. full week template maps days correctly', () => {
    const template = [
      { day_of_week: 0, start_time: '10:00', end_time: '14:00' }, // Sunday
      { day_of_week: 1, start_time: '08:00', end_time: '16:00' }, // Monday
      { day_of_week: 3, start_time: '08:00', end_time: '16:00' }, // Wednesday
      { day_of_week: 5, start_time: '08:00', end_time: '16:00' }, // Friday
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], [])

    expect(result).toHaveLength(4)
    expect(result[0].date).toBe('2025-06-16') // Mon
    expect(result[1].date).toBe('2025-06-18') // Wed
    expect(result[2].date).toBe('2025-06-20') // Fri
    expect(result[3].date).toBe('2025-06-22') // Sun
  })

  it('15. busy slot extending beyond available range only trims overlap', () => {
    const template = [
      { day_of_week: 1, start_time: '08:00', end_time: '12:00' },
    ]
    // Busy 10:00-16:00 EDT — extends past the 12:00 end
    const busySlots = [
      { start_time: '2025-06-16T14:00:00.000Z', end_time: '2025-06-16T20:00:00.000Z' },
    ]
    const result = computeAvailabilityFromData(WEEK_START, template, [], busySlots)

    expect(result).toHaveLength(1)
    expect(result[0].start).toBe('2025-06-16T12:00:00.000Z') // 08:00 EDT
    expect(result[0].end).toBe('2025-06-16T14:00:00.000Z')   // 10:00 EDT
  })
})
