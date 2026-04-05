import { DAVClient } from 'tsdav'

// =============================================
// Types
// =============================================

export interface CalDAVEvent {
  uid: string
  url: string
  etag: string
  start: string  // ISO 8601
  end: string    // ISO 8601
  summary: string
  description: string
}

export interface SyncResult {
  pushed: number
  pulled: number
  deleted: number
  conflicts: number
  errors: string[]
}

export interface CalDAVCalendar {
  displayName: string
  url: string
  ctag: string
}

interface SlotInput {
  id: string
  start_time: string
  end_time: string
  description: string | null
  type: string
}

// =============================================
// Helpers (reused from booking-ics route pattern)
// =============================================

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function icsUtcToIso(icsDate: string): string {
  // 20260410T140000Z -> 2026-04-10T14:00:00Z
  const m = icsDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
  if (!m) return icsDate
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`
}

function scrubCredentials(message: string): string {
  const password = process.env.ICLOUD_APP_PASSWORD
  if (password && message.includes(password)) {
    return message.replaceAll(password, '***')
  }
  return message
}

// =============================================
// sanitizeInboundText
// =============================================

export function sanitizeInboundText(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 1000)
}

// =============================================
// slotToVEvent
// =============================================

export function slotToVEvent(
  slot: SlotInput,
  studentName: string,
  lessonTitle?: string | null
): string {
  const uid = `${slot.id}@merlinflight.com`
  const start = new Date(slot.start_time)
  const end = new Date(slot.end_time)
  const now = new Date()

  let summary =
    slot.type === 'tour'
      ? `Discovery Flight - ${studentName}`
      : `Flight Training - ${studentName}`

  if (lessonTitle) {
    summary += ` | ${lessonTitle}`
  }

  const description =
    slot.description ?? `Booking with Merlin Flight Training`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Merlin Flight Training//CalDAV Sync//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'LOCATION:Merlin Flight Training',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

// =============================================
// createCalDAVClient
// =============================================

export async function createCalDAVClient(appleId: string): Promise<DAVClient> {
  const password = process.env.ICLOUD_APP_PASSWORD
  if (!password) {
    throw new Error('ICLOUD_APP_PASSWORD environment variable is not set')
  }

  const client = new DAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials: {
      username: appleId,
      password,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  })

  try {
    await client.login()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('CalDAV login error:', scrubCredentials(message))
    throw new Error(`CalDAV login failed: ${scrubCredentials(message)}`)
  }

  return client
}

// =============================================
// fetchCalendars
// =============================================

export async function fetchCalendars(client: DAVClient): Promise<CalDAVCalendar[]> {
  try {
    const calendars = await client.fetchCalendars()
    return calendars.map((cal: any) => ({
      displayName: cal.displayName ?? '',
      url: cal.url ?? '',
      ctag: cal.props?.getctag ?? '',
    }))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('CalDAV fetchCalendars error:', scrubCredentials(message))
    throw new Error(`Failed to fetch calendars: ${scrubCredentials(message)}`)
  }
}

// =============================================
// pushEventToCalendar
// =============================================

export async function pushEventToCalendar(
  client: DAVClient,
  calendarUrl: string,
  slot: SlotInput,
  studentName: string,
  lessonTitle?: string | null,
  existingUrl?: string,
  existingEtag?: string
): Promise<{ url: string; etag: string }> {
  const vcalendar = slotToVEvent(slot, studentName, lessonTitle)

  try {
    if (existingUrl && existingEtag) {
      // tsdav types declare Response but runtime returns { url, etag }
      const result = await client.updateCalendarObject({
        calendarObject: {
          url: existingUrl,
          etag: existingEtag,
          data: vcalendar,
        },
      }) as unknown as { url: string; etag: string }
      return { url: result.url, etag: result.etag }
    }

    // tsdav types declare Response but runtime returns { url, etag }
    const result = await client.createCalendarObject({
      calendar: { url: calendarUrl },
      filename: `${slot.id}.ics`,
      iCalString: vcalendar,
    }) as unknown as { url: string; etag: string }
    return { url: result.url, etag: result.etag }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('CalDAV push error:', scrubCredentials(message))
    throw new Error(`Failed to push event to calendar: ${scrubCredentials(message)}`)
  }
}

// =============================================
// pullEventsFromCalendar
// =============================================

export async function pullEventsFromCalendar(
  client: DAVClient,
  calendarUrl: string,
  syncToken?: string | null
): Promise<{ events: CalDAVEvent[]; newSyncToken: string | null }> {
  try {
    const fetchOptions: Record<string, unknown> = { calendar: { url: calendarUrl } }
    if (syncToken) {
      fetchOptions.syncToken = syncToken
    }

    // tsdav returns DAVCalendarObject[] or { objects, syncToken } depending on sync mode
    const response = await client.fetchCalendarObjects(fetchOptions as Parameters<typeof client.fetchCalendarObjects>[0])
    const rawResponse = response as unknown as { objects?: Array<{ url: string; etag: string; data: string }>; syncToken?: string } | Array<{ url: string; etag: string; data: string }>
    const objects = Array.isArray(rawResponse) ? rawResponse : (rawResponse.objects ?? [])
    const newSyncToken: string | null = Array.isArray(rawResponse) ? null : (rawResponse.syncToken ?? null)

    const events: CalDAVEvent[] = []

    for (const obj of objects) {
      const data: string = obj.data ?? ''
      const uid = extractIcsField(data, 'UID')
      if (!uid || !uid.endsWith('@merlinflight.com')) continue

      events.push({
        uid,
        url: obj.url ?? '',
        etag: obj.etag ?? '',
        start: icsUtcToIso(extractIcsField(data, 'DTSTART') ?? ''),
        end: icsUtcToIso(extractIcsField(data, 'DTEND') ?? ''),
        summary: sanitizeInboundText(extractIcsField(data, 'SUMMARY') ?? ''),
        description: sanitizeInboundText(extractIcsField(data, 'DESCRIPTION') ?? ''),
      })
    }

    return { events, newSyncToken }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('CalDAV pull error:', scrubCredentials(message))
    throw new Error(`Failed to pull events from calendar: ${scrubCredentials(message)}`)
  }
}

function extractIcsField(icsData: string, field: string): string | null {
  const regex = new RegExp(`^${field}[^:]*:(.+)$`, 'm')
  const match = icsData.match(regex)
  return match ? match[1].trim() : null
}

// =============================================
// deleteCalendarEvent
// =============================================

export async function deleteCalendarEvent(
  client: DAVClient,
  eventUrl: string,
  etag: string
): Promise<void> {
  try {
    await client.deleteCalendarObject({
      calendarObject: { url: eventUrl, etag },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('CalDAV delete error:', scrubCredentials(message))
    throw new Error(`Failed to delete calendar event: ${scrubCredentials(message)}`)
  }
}
