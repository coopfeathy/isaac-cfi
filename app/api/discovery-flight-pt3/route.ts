import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailTemplates } from '@/lib/resend'

function mergeSection(existingNotes: string | null, sectionTitle: string, sectionBody: string): string {
  const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sectionPattern = new RegExp(`--- ${escapedTitle} ---[\\s\\S]*?(?=\\n\\n--- |$)`, 'm')
  const nextSection = `--- ${sectionTitle} ---\n${sectionBody.trim()}`

  if (!existingNotes || !existingNotes.trim()) {
    return nextSection
  }

  if (sectionPattern.test(existingNotes)) {
    return existingNotes.replace(sectionPattern, nextSection)
  }

  return `${existingNotes.trim()}\n\n${nextSection}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const {
      selectedLocation,
      email
    } = await request.json()

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required to update form' },
        { status: 400 }
      )
    }

    const sectionBody = [
      'Funnel Step: 3/4',
      `Preferred Location: ${selectedLocation}`
    ].join('\n')

    const { data: existingProspect } = await supabase
      .from('prospects')
      .select('notes')
      .eq('email', email)
      .maybeSingle()

    const mergedNotes = mergeSection(existingProspect?.notes ?? null, 'Step 3 - Location', sectionBody)

    // Update the prospect record for this email and preserve previous notes
    const { error } = await supabase
      .from('prospects')
      .update({
        meeting_location: selectedLocation,
        source: 'discovery_flight',
        notes: mergedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save form data' },
        { status: 500 }
      )
    }

    // Owner alert — fire-and-forget, never blocks the response.
    // At this point the prospect has accumulated all 3 funnel steps in `notes`.
    try {
      if (process.env.RESEND_API_KEY) {
        const { data: fullProspect } = await supabase
          .from('prospects')
          .select('full_name, phone, meeting_location, notes')
          .eq('email', email)
          .maybeSingle()

        const resend = new Resend(process.env.RESEND_API_KEY)
        const tpl = emailTemplates.prospectAdminAlert({
          stage: 'Funnel complete (all 3 steps)',
          email,
          details: [
            { label: 'Name', value: fullProspect?.full_name ?? '' },
            { label: 'Phone', value: fullProspect?.phone ?? '' },
            { label: 'Preferred Location', value: selectedLocation },
            {
              label: 'Funnel Notes',
              value: fullProspect?.notes
                ? `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${fullProspect.notes}</pre>`
                : '',
            },
          ],
        })
        await resend.emails.send({
          from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
          to: ['MerlinFlightTraining@gmail.com'],
          subject: tpl.subject,
          html: tpl.html,
        })
      }
    } catch (alertErr) {
      console.error('Owner prospect alert failed (prospect saved):', alertErr)
    }

    return NextResponse.json(
      { message: 'Form data saved successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
