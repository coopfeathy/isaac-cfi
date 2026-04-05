import {
  slotToVEvent,
  sanitizeInboundText,
  createCalDAVClient,
  fetchCalendars,
  pushEventToCalendar,
  pullEventsFromCalendar,
  deleteCalendarEvent,
  CalDAVEvent,
  CalDAVCalendar,
  SyncResult,
} from '@/lib/caldav'

// --- Mock tsdav ---
const mockLogin = jest.fn().mockResolvedValue(undefined)
const mockFetchCalendars = jest.fn()
const mockCreateCalendarObject = jest.fn()
const mockUpdateCalendarObject = jest.fn()
const mockDeleteCalendarObject = jest.fn()
const mockFetchCalendarObjects = jest.fn()

jest.mock('tsdav', () => ({
  DAVClient: jest.fn().mockImplementation(() => ({
    login: mockLogin,
    fetchCalendars: mockFetchCalendars,
    createCalendarObject: mockCreateCalendarObject,
    updateCalendarObject: mockUpdateCalendarObject,
    deleteCalendarObject: mockDeleteCalendarObject,
    fetchCalendarObjects: mockFetchCalendarObjects,
  })),
}))

beforeEach(() => {
  jest.clearAllMocks()
  process.env.ICLOUD_APP_PASSWORD = 'test-app-password'
})

afterEach(() => {
  delete process.env.ICLOUD_APP_PASSWORD
})

// =============================================
// slotToVEvent
// =============================================
describe('slotToVEvent', () => {
  const baseSlot = {
    id: 'abc-123',
    start_time: '2026-04-10T14:00:00Z',
    end_time: '2026-04-10T16:00:00Z',
    description: null,
    type: 'training' as const,
  }

  it('generates a valid VCALENDAR string with correct UID', () => {
    const result = slotToVEvent(baseSlot, 'John Doe')
    expect(result).toContain('BEGIN:VCALENDAR')
    expect(result).toContain('END:VCALENDAR')
    expect(result).toContain('UID:abc-123@merlinflight.com')
  })

  it('uses training summary for training type', () => {
    const result = slotToVEvent(baseSlot, 'John Doe')
    expect(result).toContain('SUMMARY:Flight Training - John Doe')
  })

  it('uses discovery flight summary for tour type', () => {
    const slot = { ...baseSlot, type: 'tour' as const }
    const result = slotToVEvent(slot, 'Jane Smith')
    expect(result).toContain('SUMMARY:Discovery Flight - Jane Smith')
  })

  it('appends lesson title to summary when provided', () => {
    const result = slotToVEvent(baseSlot, 'John Doe', 'Steep Turns')
    expect(result).toContain('SUMMARY:Flight Training - John Doe | Steep Turns')
  })

  it('formats DTSTART and DTEND in iCalendar UTC format', () => {
    const result = slotToVEvent(baseSlot, 'John Doe')
    expect(result).toContain('DTSTART:20260410T140000Z')
    expect(result).toContain('DTEND:20260410T160000Z')
  })

  it('uses slot description when provided', () => {
    const slot = { ...baseSlot, description: 'Practice area work' }
    const result = slotToVEvent(slot, 'John Doe')
    expect(result).toContain('DESCRIPTION:Practice area work')
  })

  it('uses generic description when slot description is null', () => {
    const result = slotToVEvent(baseSlot, 'John Doe')
    expect(result).toContain('DESCRIPTION:')
    expect(result).not.toContain('DESCRIPTION:\r\n')
  })

  it('includes LOCATION and STATUS', () => {
    const result = slotToVEvent(baseSlot, 'John Doe')
    expect(result).toContain('LOCATION:Merlin Flight Training')
    expect(result).toContain('STATUS:CONFIRMED')
  })

  it('escapes special characters in text fields', () => {
    const slot = { ...baseSlot, description: 'Line1\nLine2; with, commas\\backslash' }
    const result = slotToVEvent(slot, 'John Doe')
    expect(result).toContain('DESCRIPTION:Line1\\nLine2\\; with\\, commas\\\\backslash')
  })

  it('does not append lesson title separator when lessonTitle is null', () => {
    const result = slotToVEvent(baseSlot, 'John Doe', null)
    expect(result).toContain('SUMMARY:Flight Training - John Doe')
    expect(result).not.toContain('|')
  })
})

// =============================================
// sanitizeInboundText
// =============================================
describe('sanitizeInboundText', () => {
  it('strips HTML tags', () => {
    expect(sanitizeInboundText('<b>Bold</b> text')).toBe('Bold text')
  })

  it('strips nested and self-closing tags', () => {
    expect(sanitizeInboundText('<div><img src="x"/><p>Hello</p></div>')).toBe('Hello')
  })

  it('limits output to 1000 characters', () => {
    const long = 'a'.repeat(2000)
    expect(sanitizeInboundText(long)).toHaveLength(1000)
  })

  it('trims whitespace', () => {
    expect(sanitizeInboundText('  hello  ')).toBe('hello')
  })

  it('handles empty string', () => {
    expect(sanitizeInboundText('')).toBe('')
  })

  it('strips script tags and their content pattern', () => {
    expect(sanitizeInboundText('<script>alert("xss")</script>Safe')).not.toContain('alert')
  })
})

// =============================================
// createCalDAVClient
// =============================================
describe('createCalDAVClient', () => {
  it('creates a DAVClient and calls login', async () => {
    const { DAVClient } = require('tsdav')
    const client = await createCalDAVClient('user@icloud.com')
    expect(DAVClient).toHaveBeenCalledWith({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: 'user@icloud.com',
        password: 'test-app-password',
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    })
    expect(mockLogin).toHaveBeenCalled()
    expect(client).toBeDefined()
  })

  it('throws when ICLOUD_APP_PASSWORD is missing', async () => {
    delete process.env.ICLOUD_APP_PASSWORD
    await expect(createCalDAVClient('user@icloud.com')).rejects.toThrow(
      'ICLOUD_APP_PASSWORD environment variable is not set'
    )
  })

  it('does not leak credentials in error messages on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Auth failed for test-app-password'))
    try {
      await createCalDAVClient('user@icloud.com')
      fail('Expected an error')
    } catch (e: any) {
      expect(e.message).not.toContain('test-app-password')
      expect(e.message).toContain('CalDAV login failed')
    }
  })
})

// =============================================
// fetchCalendars
// =============================================
describe('fetchCalendars', () => {
  it('returns array of { displayName, url, ctag }', async () => {
    mockFetchCalendars.mockResolvedValueOnce([
      { displayName: 'Personal', url: '/cal/1/', props: { getctag: 'ctag-1' } },
      { displayName: 'Work', url: '/cal/2/', props: { getctag: 'ctag-2' } },
    ])
    const client = await createCalDAVClient('user@icloud.com')
    const calendars = await fetchCalendars(client)
    expect(calendars).toEqual([
      { displayName: 'Personal', url: '/cal/1/', ctag: 'ctag-1' },
      { displayName: 'Work', url: '/cal/2/', ctag: 'ctag-2' },
    ])
  })

  it('handles empty calendar list', async () => {
    mockFetchCalendars.mockResolvedValueOnce([])
    const client = await createCalDAVClient('user@icloud.com')
    const calendars = await fetchCalendars(client)
    expect(calendars).toEqual([])
  })
})

// =============================================
// pushEventToCalendar
// =============================================
describe('pushEventToCalendar', () => {
  const slot = {
    id: 'slot-1',
    start_time: '2026-04-10T14:00:00Z',
    end_time: '2026-04-10T16:00:00Z',
    description: null,
    type: 'training' as const,
  }

  it('creates a new calendar object when no existingUrl', async () => {
    mockCreateCalendarObject.mockResolvedValueOnce({
      url: '/cal/1/slot-1.ics',
      etag: '"etag-new"',
    })
    const client = await createCalDAVClient('user@icloud.com')
    const result = await pushEventToCalendar(client, '/cal/1/', slot, 'John Doe')
    expect(mockCreateCalendarObject).toHaveBeenCalledWith(
      expect.objectContaining({
        calendar: { url: '/cal/1/' },
        filename: 'slot-1.ics',
      })
    )
    expect(result).toEqual({ url: '/cal/1/slot-1.ics', etag: '"etag-new"' })
  })

  it('updates existing calendar object when existingUrl and etag provided', async () => {
    mockUpdateCalendarObject.mockResolvedValueOnce({
      url: '/cal/1/slot-1.ics',
      etag: '"etag-updated"',
    })
    const client = await createCalDAVClient('user@icloud.com')
    const result = await pushEventToCalendar(
      client,
      '/cal/1/',
      slot,
      'John Doe',
      null,
      '/cal/1/slot-1.ics',
      '"etag-old"'
    )
    expect(mockUpdateCalendarObject).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarObject: expect.objectContaining({
          url: '/cal/1/slot-1.ics',
          etag: '"etag-old"',
        }),
      })
    )
    expect(result).toEqual({ url: '/cal/1/slot-1.ics', etag: '"etag-updated"' })
  })
})

// =============================================
// pullEventsFromCalendar
// =============================================
describe('pullEventsFromCalendar', () => {
  const makeIcs = (uid: string, start: string, end: string, summary: string, desc: string) =>
    [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

  it('returns only events with @merlinflight.com UIDs', async () => {
    mockFetchCalendarObjects.mockResolvedValueOnce({
      objects: [
        {
          url: '/cal/1/slot-1.ics',
          etag: '"etag-1"',
          data: makeIcs('slot-1@merlinflight.com', '20260410T140000Z', '20260410T160000Z', 'Flight Training - John', 'Lesson'),
        },
        {
          url: '/cal/1/external.ics',
          etag: '"etag-ext"',
          data: makeIcs('random-uid@gmail.com', '20260410T100000Z', '20260410T110000Z', 'Lunch', 'Personal'),
        },
      ],
      syncToken: 'new-token-123',
    })
    const client = await createCalDAVClient('user@icloud.com')
    const result = await pullEventsFromCalendar(client, '/cal/1/')
    expect(result.events).toHaveLength(1)
    expect(result.events[0].uid).toBe('slot-1@merlinflight.com')
    expect(result.newSyncToken).toBe('new-token-123')
  })

  it('parses DTSTART/DTEND into ISO 8601 strings', async () => {
    mockFetchCalendarObjects.mockResolvedValueOnce({
      objects: [
        {
          url: '/cal/1/s.ics',
          etag: '"e"',
          data: makeIcs('s@merlinflight.com', '20260410T140000Z', '20260410T160000Z', 'Test', 'Desc'),
        },
      ],
      syncToken: null,
    })
    const client = await createCalDAVClient('user@icloud.com')
    const result = await pullEventsFromCalendar(client, '/cal/1/')
    expect(result.events[0].start).toBe('2026-04-10T14:00:00Z')
    expect(result.events[0].end).toBe('2026-04-10T16:00:00Z')
  })

  it('passes syncToken when provided', async () => {
    mockFetchCalendarObjects.mockResolvedValueOnce({ objects: [], syncToken: 'tok-2' })
    const client = await createCalDAVClient('user@icloud.com')
    await pullEventsFromCalendar(client, '/cal/1/', 'tok-1')
    expect(mockFetchCalendarObjects).toHaveBeenCalledWith(
      expect.objectContaining({ syncToken: 'tok-1' })
    )
  })

  it('returns empty events for empty calendar', async () => {
    mockFetchCalendarObjects.mockResolvedValueOnce({ objects: [], syncToken: null })
    const client = await createCalDAVClient('user@icloud.com')
    const result = await pullEventsFromCalendar(client, '/cal/1/')
    expect(result.events).toEqual([])
    expect(result.newSyncToken).toBeNull()
  })
})

// =============================================
// deleteCalendarEvent
// =============================================
describe('deleteCalendarEvent', () => {
  it('calls deleteCalendarObject with correct params', async () => {
    mockDeleteCalendarObject.mockResolvedValueOnce(undefined)
    const client = await createCalDAVClient('user@icloud.com')
    await deleteCalendarEvent(client, '/cal/1/slot-1.ics', '"etag-1"')
    expect(mockDeleteCalendarObject).toHaveBeenCalledWith({
      calendarObject: { url: '/cal/1/slot-1.ics', etag: '"etag-1"' },
    })
  })
})

// =============================================
// Error handling paths
// =============================================
describe('error handling', () => {
  it('fetchCalendars wraps errors with clean message', async () => {
    mockFetchCalendars.mockRejectedValueOnce(new Error('Network timeout'))
    const client = await createCalDAVClient('user@icloud.com')
    await expect(fetchCalendars(client)).rejects.toThrow('Failed to fetch calendars: Network timeout')
  })

  it('pushEventToCalendar create wraps errors', async () => {
    mockCreateCalendarObject.mockRejectedValueOnce(new Error('403 Forbidden'))
    const slot = { id: 's1', start_time: '2026-04-10T14:00:00Z', end_time: '2026-04-10T16:00:00Z', description: null, type: 'training' as const }
    const client = await createCalDAVClient('user@icloud.com')
    await expect(pushEventToCalendar(client, '/cal/', slot, 'Jane')).rejects.toThrow('Failed to push event to calendar')
  })

  it('pushEventToCalendar update wraps errors', async () => {
    mockUpdateCalendarObject.mockRejectedValueOnce(new Error('412 Precondition Failed'))
    const slot = { id: 's1', start_time: '2026-04-10T14:00:00Z', end_time: '2026-04-10T16:00:00Z', description: null, type: 'training' as const }
    const client = await createCalDAVClient('user@icloud.com')
    await expect(pushEventToCalendar(client, '/cal/', slot, 'Jane', null, '/cal/s1.ics', '"old"')).rejects.toThrow('Failed to push event to calendar')
  })

  it('pullEventsFromCalendar wraps errors', async () => {
    mockFetchCalendarObjects.mockRejectedValueOnce(new Error('Connection refused'))
    const client = await createCalDAVClient('user@icloud.com')
    await expect(pullEventsFromCalendar(client, '/cal/')).rejects.toThrow('Failed to pull events from calendar')
  })

  it('deleteCalendarEvent wraps errors', async () => {
    mockDeleteCalendarObject.mockRejectedValueOnce(new Error('404 Not Found'))
    const client = await createCalDAVClient('user@icloud.com')
    await expect(deleteCalendarEvent(client, '/cal/s.ics', '"e"')).rejects.toThrow('Failed to delete calendar event')
  })

  it('scrubs credentials from all error paths', async () => {
    mockFetchCalendars.mockRejectedValueOnce(new Error('bad auth test-app-password leaked'))
    const client = await createCalDAVClient('user@icloud.com')
    try {
      await fetchCalendars(client)
      fail('expected error')
    } catch (e: any) {
      expect(e.message).not.toContain('test-app-password')
      expect(e.message).toContain('***')
    }
  })
})

// =============================================
// icsUtcToIso edge case
// =============================================
describe('pullEventsFromCalendar edge cases', () => {
  it('handles non-standard date format gracefully', async () => {
    mockFetchCalendarObjects.mockResolvedValueOnce([
      {
        url: '/cal/1/x.ics',
        etag: '"e"',
        data: [
          'BEGIN:VCALENDAR',
          'BEGIN:VEVENT',
          'UID:x@merlinflight.com',
          'DTSTART:not-a-date',
          'DTEND:not-a-date',
          'SUMMARY:Test',
          'DESCRIPTION:Test',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
      },
    ])
    const client = await createCalDAVClient('user@icloud.com')
    const result = await pullEventsFromCalendar(client, '/cal/1/')
    expect(result.events).toHaveLength(1)
    expect(result.events[0].start).toBe('not-a-date')
  })

  it('handles response as plain array (no syncToken)', async () => {
    mockFetchCalendarObjects.mockResolvedValueOnce([
      {
        url: '/cal/1/y.ics',
        etag: '"e"',
        data: 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:y@merlinflight.com\r\nDTSTART:20260410T140000Z\r\nDTEND:20260410T160000Z\r\nSUMMARY:S\r\nDESCRIPTION:D\r\nEND:VEVENT\r\nEND:VCALENDAR',
      },
    ])
    const client = await createCalDAVClient('user@icloud.com')
    const result = await pullEventsFromCalendar(client, '/cal/1/')
    expect(result.events).toHaveLength(1)
    expect(result.newSyncToken).toBeNull()
  })
})

// =============================================
// Type exports
// =============================================
describe('Type exports', () => {
  it('CalDAVEvent interface is usable', () => {
    const event: CalDAVEvent = {
      uid: 'test@merlinflight.com',
      url: '/cal/1/test.ics',
      etag: '"e"',
      start: '2026-04-10T14:00:00Z',
      end: '2026-04-10T16:00:00Z',
      summary: 'Test',
      description: 'Desc',
    }
    expect(event.uid).toBe('test@merlinflight.com')
  })

  it('SyncResult interface is usable', () => {
    const result: SyncResult = { pushed: 1, pulled: 2, deleted: 0, conflicts: 0, errors: [] }
    expect(result.pushed).toBe(1)
  })

  it('CalDAVCalendar interface is usable', () => {
    const cal: CalDAVCalendar = { displayName: 'Test', url: '/cal/', ctag: 'c' }
    expect(cal.displayName).toBe('Test')
  })
})
