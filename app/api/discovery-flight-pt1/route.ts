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
      isForSomeoneElse,
      citizenship, 
      firstName, 
      lastName, 
      phoneNumber, 
      dateOfBirth, 
      trainingObjective, 
      trainingStart,
      agreeToSMS,
      email 
    } = await request.json()

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !dateOfBirth || !citizenship || !trainingObjective || !trainingStart || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const sectionBody = [
      'Funnel Step: 1/4',
      `DOB: ${dateOfBirth}`,
      `Citizenship: ${citizenship}`,
      `Training Objective: ${trainingObjective}`,
      `Training Start: ${trainingStart}`,
      `For Someone Else: ${isForSomeoneElse}`,
      `Agree to SMS: ${agreeToSMS}`
    ].join('\n')

    const { data: existingProspect } = await supabase
      .from('prospects')
      .select('notes')
      .eq('email', email)
      .maybeSingle()

    const mergedNotes = mergeSection(existingProspect?.notes ?? null, 'Step 1 - Basics', sectionBody)

    // Update prospect record with merged notes so earlier step data is preserved
    const { error } = await supabase
      .from('prospects')
      .update({
        full_name: `${firstName} ${lastName}`.trim(),
        phone: phoneNumber,
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

    // Owner alert — fire-and-forget, never blocks the response
    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const tpl = emailTemplates.prospectAdminAlert({
          stage: 'Funnel Step 1 complete (basics)',
          email,
          details: [
            { label: 'Name', value: `${firstName} ${lastName}`.trim() },
            { label: 'Phone', value: phoneNumber },
            { label: 'Date of Birth', value: dateOfBirth },
            { label: 'Citizenship', value: citizenship },
            { label: 'Training Objective', value: trainingObjective },
            { label: 'Training Start', value: trainingStart },
            { label: 'For Someone Else', value: String(isForSomeoneElse) },
            { label: 'Agreed to SMS', value: String(agreeToSMS) },
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
