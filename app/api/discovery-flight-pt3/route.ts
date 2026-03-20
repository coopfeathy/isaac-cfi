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
        source: 'onboarding_funnel',
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
