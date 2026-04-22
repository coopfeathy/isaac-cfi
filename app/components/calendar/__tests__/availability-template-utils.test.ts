import {
  DAY_NAMES,
  generateTimeOptions,
  formatTimeDisplay,
  validateTimeRange,
  checkOverlap,
  parseTimeToMinutes,
} from '../availability-template-utils'
import type { InstructorAvailability } from '@/lib/types/calendar'

describe('availability-template-utils', () => {
  describe('DAY_NAMES', () => {
    it('has 7 entries starting from Sunday', () => {
      expect(DAY_NAMES).toHaveLength(7)
      expect(DAY_NAMES[0]).toBe('Sunday')
      expect(DAY_NAMES[6]).toBe('Saturday')
    })
  })

  describe('generateTimeOptions', () => {
    it('generates 30-minute increment options from 06:00 to 22:00', () => {
      const options = generateTimeOptions()
      expect(options[0]).toEqual({ label: '6:00 AM', value: '06:00' })
      expect(options[1]).toEqual({ label: '6:30 AM', value: '06:30' })
      expect(options[options.length - 1]).toEqual({ label: '10:00 PM', value: '22:00' })
    })

    it('includes noon and PM times', () => {
      const options = generateTimeOptions()
      const noon = options.find((o) => o.value === '12:00')
      expect(noon).toEqual({ label: '12:00 PM', value: '12:00' })
      const onePm = options.find((o) => o.value === '13:00')
      expect(onePm).toEqual({ label: '1:00 PM', value: '13:00' })
    })
  })

  describe('formatTimeDisplay', () => {
    it('formats HH:MM:SS to 12-hour display', () => {
      expect(formatTimeDisplay('08:00:00')).toBe('8:00 AM')
      expect(formatTimeDisplay('13:30:00')).toBe('1:30 PM')
      expect(formatTimeDisplay('00:00:00')).toBe('12:00 AM')
      expect(formatTimeDisplay('12:00:00')).toBe('12:00 PM')
    })

    it('handles HH:MM format (no seconds)', () => {
      expect(formatTimeDisplay('08:00')).toBe('8:00 AM')
      expect(formatTimeDisplay('16:45')).toBe('4:45 PM')
    })
  })

  describe('parseTimeToMinutes', () => {
    it('converts HH:MM to minutes since midnight', () => {
      expect(parseTimeToMinutes('00:00')).toBe(0)
      expect(parseTimeToMinutes('08:30')).toBe(510)
      expect(parseTimeToMinutes('12:00')).toBe(720)
      expect(parseTimeToMinutes('23:59')).toBe(1439)
    })

    it('handles HH:MM:SS format', () => {
      expect(parseTimeToMinutes('08:30:00')).toBe(510)
    })
  })

  describe('validateTimeRange', () => {
    it('returns null for valid range', () => {
      expect(validateTimeRange('08:00', '16:00')).toBeNull()
      expect(validateTimeRange('06:00', '06:30')).toBeNull()
    })

    it('returns error when start equals end', () => {
      expect(validateTimeRange('08:00', '08:00')).toBe('Start time must be before end time')
    })

    it('returns error when start is after end', () => {
      expect(validateTimeRange('16:00', '08:00')).toBe('Start time must be before end time')
    })
  })

  describe('checkOverlap', () => {
    const makeEntry = (
      id: string,
      day: number,
      start: string,
      end: string,
      active = true,
    ): InstructorAvailability => ({
      id,
      day_of_week: day,
      start_time: start,
      end_time: end,
      is_active: active,
      created_at: '',
      updated_at: '',
    })

    it('returns false when no entries exist for the day', () => {
      const entries = [makeEntry('1', 1, '08:00:00', '12:00:00')]
      expect(checkOverlap(entries, 2, '08:00', '12:00')).toBe(false)
    })

    it('returns false for non-overlapping ranges on same day', () => {
      const entries = [makeEntry('1', 1, '08:00:00', '12:00:00')]
      expect(checkOverlap(entries, 1, '12:00', '16:00')).toBe(false)
      expect(checkOverlap(entries, 1, '06:00', '08:00')).toBe(false)
    })

    it('returns true for overlapping ranges', () => {
      const entries = [makeEntry('1', 1, '08:00:00', '12:00:00')]
      expect(checkOverlap(entries, 1, '07:00', '09:00')).toBe(true)
      expect(checkOverlap(entries, 1, '11:00', '13:00')).toBe(true)
      expect(checkOverlap(entries, 1, '09:00', '11:00')).toBe(true)
    })

    it('returns true for exactly containing range', () => {
      const entries = [makeEntry('1', 1, '08:00:00', '16:00:00')]
      expect(checkOverlap(entries, 1, '09:00', '15:00')).toBe(true)
    })

    it('excludes entry by id when editing', () => {
      const entries = [makeEntry('1', 1, '08:00:00', '12:00:00')]
      expect(checkOverlap(entries, 1, '08:00', '12:00', '1')).toBe(false)
    })

    it('still detects overlap with other entries when excludeId is set', () => {
      const entries = [
        makeEntry('1', 1, '08:00:00', '12:00:00'),
        makeEntry('2', 1, '13:00:00', '17:00:00'),
      ]
      expect(checkOverlap(entries, 1, '12:00', '14:00', '1')).toBe(true)
    })
  })
})
