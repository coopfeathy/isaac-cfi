import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

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
