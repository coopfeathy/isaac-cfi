import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailTemplates } from '@/lib/resend'
import { applyRateLimit } from '@/lib/ratelimit'

type RequirementsChecklist = {
  tsa?: boolean
  medical?: boolean
  'student-cert'?: boolean
  enrollment?: boolean
}

type StartTrainingPayload = {
  email?: string
  fullName?: string
  phone?: string
  preferredLocation?: string
  earliestStart?: string
  notes?: string
  requirementsChecklist?: RequirementsChecklist
}

/**
 * Merge a labeled section into the prospect's `notes` column without
 * clobbering prior funnel sections — mirrors the pattern used by
 * /api/discovery-flight-pt3.
 */
function mergeSection(
  existingNotes: string | null,
  sectionTitle: string,
  sectionBody: string,
): string {
  const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sectionPattern = new RegExp(
    `--- ${escapedTitle} ---[\\s\\S]*?(?=\\n\\n--- |$)`,
    'm',
  )
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
  // ---- Rate limit ---------------------------------------------------------
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  // ---- Parse + validate ---------------------------------------------------
  let payload: StartTrainingPayload
  try {
    payload = (await request.json()) as StartTrainingPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    email,
    fullName,
    phone,
    preferredLocation,
    earliestStart,
    notes,
    requirementsChecklist = {},
  } = payload

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (!fullName?.trim()) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  }
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  }
  if (!preferredLocation) {
    return NextResponse.json({ error: 'Training location is required' }, { status: 400 })
  }
  if (!earliestStart) {
    return NextResponse.json({ error: 'Earliest start date is required' }, { status: 400 })
  }

  // ---- Supabase client ----------------------------------------------------
  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch {
    console.error(
      'Supabase admin client failed to initialize — SUPABASE_SERVICE_ROLE_KEY may be missing',
    )
    return NextResponse.json(
      { error: 'Server configuration error. Please contact support.' },
      { status: 500 },
    )
  }

  // ---- Build the notes section to append ---------------------------------
  const checklistSummary = [
    `TSA Citizenship Verification: ${requirementsChecklist.tsa ? '✓' : '○'}`,
    `FAA Class 3 Medical: ${requirementsChecklist.medical ? '✓' : '○'}`,
    `Student Pilot Certificate (IACRA): ${requirementsChecklist['student-cert'] ? '✓' : '○'}`,
    `Enrollment Paperwork + Deposit: ${requirementsChecklist.enrollment ? '✓' : '○'}`,
  ].join('\n')

  const sectionBody = [
    `Submitted: ${new Date().toISOString()}`,
    `Name: ${fullName.trim()}`,
    `Phone: ${phone.trim()}`,
    `Preferred Location: ${preferredLocation}`,
    `Requested First Lesson: ${earliestStart}`,
    notes?.trim() ? `Student notes: ${notes.trim()}` : null,
    '',
    'Requirements Checklist (self-reported):',
    checklistSummary,
  ]
    .filter(Boolean)
    .join('\n')

  // ---- Upsert the prospect record ----------------------------------------
  const { data: existingProspect } = await supabase
    .from('prospects')
    .select('id, notes, lead_stage')
    .eq('email', email)
    .maybeSingle()

  const mergedNotes = mergeSection(
    existingProspect?.notes ?? null,
    'Start Training Intake',
    sectionBody,
  )

  if (existingProspect) {
    const { error: updateError } = await supabase
      .from('prospects')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        meeting_location: preferredLocation,
        lead_stage: 'ready_to_enroll',
        status: 'active',
        notes: mergedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email)

    if (updateError) {
      console.error('Supabase update error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to save training intake' },
        { status: 500 },
      )
    }
  } else {
    // A prospect reaching /start-training without going through the funnel
    // should still be welcomed into the pipeline.
    const { error: insertError } = await supabase.from('prospects').insert([
      {
        email,
        full_name: fullName.trim(),
        phone: phone.trim(),
        meeting_location: preferredLocation,
        source: 'start_training_page',
        lead_stage: 'ready_to_enroll',
        status: 'active',
        sequence_step: 0,
        notes: mergedNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Failed to save training intake' },
        { status: 500 },
      )
    }
  }

  // ---- Send confirmation email (best-effort, never blocks the response) -
  try {
    if (process.env.RESEND_API_KEY && emailTemplates.startTrainingConfirmation) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const template = emailTemplates.startTrainingConfirmation({
        name: fullName.trim(),
        preferredLocation,
        earliestStart,
      })
      await resend.emails.send({
        from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
        to: [email],
        subject: template.subject,
        html: template.html,
      })
    }
  } catch (emailErr) {
    console.error('Start training confirmation email failed (prospect saved):', emailErr)
  }

  return NextResponse.json(
    {
      message: 'Training intake saved successfully',
      nextStep: '/onboarding',
    },
    { status: 200 },
  )
}
