import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slotId = searchParams.get('slot_id')

    if (!slotId) {
      return NextResponse.json({ error: 'Missing slot_id' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: slot, error } = await supabase
      .from('slots')
      .select('id, start_time, end_time, type, description, price')
      .eq('id', slotId)
      .single()

    if (error || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)
    const now = new Date()
    const uid = `${slot.id}@merlinflight.com`

    const summary = slot.description?.trim()
      ? slot.description.trim()
      : slot.type === 'tour'
        ? 'Discovery Flight'
        : 'Flight Training Lesson'

    const priceText = Number.isFinite(slot.price) ? ` Price: $${(slot.price / 100).toFixed(2)}.` : ''
    const description = `Booking with Merlin Flight Training.${priceText}`

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Merlin Flight Training//Booking Calendar//EN',
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
      ''
    ].join('\r\n')

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="merlin-booking-${slot.id}.ics"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generating booking ICS:', error)
    return NextResponse.json({ error: 'Failed to generate calendar file' }, { status: 500 })
  }
}
