import {
  START_HOUR,
  END_HOUR,
  ROW_HEIGHT_PX,
  HALF_HOUR,
  TOTAL_ROWS,
  getTimeBlockPosition,
  getTimeBlockClasses,
  formatWeekLabel,
  generateTimeLabels,
  formatDayHeader,
  type TimeBlockVariant,
} from '../calendar-utils'

describe('calendar constants', () => {
  test('START_HOUR is 6 (6:00 AM)', () => {
    expect(START_HOUR).toBe(6)
  })

  test('END_HOUR is 21 (9:00 PM)', () => {
    expect(END_HOUR).toBe(21)
  })

  test('ROW_HEIGHT_PX is 32', () => {
    expect(ROW_HEIGHT_PX).toBe(32)
  })

  test('HALF_HOUR is 30', () => {
    expect(HALF_HOUR).toBe(30)
  })

  test('TOTAL_ROWS is 30 (15 hours * 2 half-hours)', () => {
    expect(TOTAL_ROWS).toBe(30)
  })
})

describe('getTimeBlockPosition', () => {
  test('returns top=0 and correct height for block starting at 6:00 AM (startMinutes=0)', () => {
    const result = getTimeBlockPosition(0, 60)
    expect(result).toEqual({ top: 0, height: 64 })
  })

  test('positions a block at 8:00 AM (startMinutes=120)', () => {
    const result = getTimeBlockPosition(120, 30)
    // top = (120 / 30) * 32 = 4 * 32 = 128
    // height = (30 / 30) * 32 = 32
    expect(result).toEqual({ top: 128, height: 32 })
  })

  test('handles 2-hour block at noon (startMinutes=360)', () => {
    const result = getTimeBlockPosition(360, 120)
    // top = (360 / 30) * 32 = 12 * 32 = 384
    // height = (120 / 30) * 32 = 4 * 32 = 128
    expect(result).toEqual({ top: 384, height: 128 })
  })

  test('enforces minimum height of ROW_HEIGHT_PX for very short blocks', () => {
    const result = getTimeBlockPosition(0, 15)
    // height would be (15/30)*32 = 16, but min is 32
    expect(result.height).toBe(ROW_HEIGHT_PX)
  })

  test('handles 0 duration with minimum height', () => {
    const result = getTimeBlockPosition(60, 0)
    expect(result.height).toBe(ROW_HEIGHT_PX)
  })
})

describe('getTimeBlockClasses', () => {
  const variants: TimeBlockVariant[] = ['available', 'busy', 'pending', 'approved', 'denied', 'blocked']

  test.each(variants)('returns a non-empty string for variant "%s"', (variant) => {
    const classes = getTimeBlockClasses(variant)
    expect(typeof classes).toBe('string')
    expect(classes.length).toBeGreaterThan(0)
  })

  test('available variant includes emerald classes', () => {
    const classes = getTimeBlockClasses('available')
    expect(classes).toContain('bg-emerald-100')
    expect(classes).toContain('border-emerald-400')
  })

  test('busy variant includes gray classes', () => {
    const classes = getTimeBlockClasses('busy')
    expect(classes).toContain('bg-gray-200')
    expect(classes).toContain('border-gray-300')
  })

  test('pending variant includes amber classes', () => {
    const classes = getTimeBlockClasses('pending')
    expect(classes).toContain('bg-amber-100')
    expect(classes).toContain('border-amber-400')
  })

  test('approved variant includes blue classes', () => {
    const classes = getTimeBlockClasses('approved')
    expect(classes).toContain('bg-blue-100')
    expect(classes).toContain('border-blue-400')
  })

  test('denied variant includes red classes', () => {
    const classes = getTimeBlockClasses('denied')
    expect(classes).toContain('bg-red-50')
    expect(classes).toContain('border-red-300')
  })

  test('blocked variant includes dark gray classes', () => {
    const classes = getTimeBlockClasses('blocked')
    expect(classes).toContain('bg-gray-300')
    expect(classes).toContain('border-gray-400')
  })
})

describe('formatWeekLabel', () => {
  test('formats a Monday date as "Week of Month Day, Year"', () => {
    const monday = new Date(2026, 3, 6) // April 6, 2026 (Monday)
    const label = formatWeekLabel(monday)
    expect(label).toContain('Week of')
    expect(label).toContain('April')
    expect(label).toContain('6')
    expect(label).toContain('2026')
  })

  test('formats January date correctly', () => {
    const monday = new Date(2026, 0, 5) // January 5, 2026
    const label = formatWeekLabel(monday)
    expect(label).toContain('January')
    expect(label).toContain('5')
    expect(label).toContain('2026')
  })
})

describe('generateTimeLabels', () => {
  test('generates 30 labels for 6AM-9PM in 30-min increments', () => {
    const labels = generateTimeLabels()
    expect(labels).toHaveLength(30)
  })

  test('first label represents 6:00 AM', () => {
    const labels = generateTimeLabels()
    expect(labels[0].hour).toBe(6)
    expect(labels[0].minute).toBe(0)
  })

  test('last label represents 8:30 PM', () => {
    const labels = generateTimeLabels()
    const last = labels[labels.length - 1]
    expect(last.hour).toBe(20)
    expect(last.minute).toBe(30)
  })

  test('each label includes a formatted display string', () => {
    const labels = generateTimeLabels()
    labels.forEach((label) => {
      expect(typeof label.display).toBe('string')
      expect(label.display.length).toBeGreaterThan(0)
    })
  })

  test('labels are sequential in 30-min increments', () => {
    const labels = generateTimeLabels()
    for (let i = 1; i < labels.length; i++) {
      const prevTotal = labels[i - 1].hour * 60 + labels[i - 1].minute
      const currTotal = labels[i].hour * 60 + labels[i].minute
      expect(currTotal - prevTotal).toBe(30)
    }
  })
})

describe('formatDayHeader', () => {
  test('returns weekday and date label for a date', () => {
    const date = new Date(2026, 3, 7) // Tuesday, April 7, 2026
    const header = formatDayHeader(date)
    expect(header.weekday).toBeTruthy()
    expect(header.dateLabel).toBeTruthy()
  })

  test('weekday is a short name (3 chars)', () => {
    const date = new Date(2026, 3, 6) // Monday
    const header = formatDayHeader(date)
    expect(header.weekday).toBe('Mon')
  })

  test('dateLabel contains month and day', () => {
    const date = new Date(2026, 3, 7) // Apr 7
    const header = formatDayHeader(date)
    expect(header.dateLabel).toContain('Apr')
    expect(header.dateLabel).toContain('7')
  })
})
