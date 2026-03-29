import type { Config, Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

declare const process: {
  env: Record<string, string | undefined>
}

export const config: Config = {
  schedule: '*/5 * * * *',
}

type QueueRow = {
  id: string
  lesson_evaluation_id: string
  student_id: string
  course_id: string
  lesson_id: string | null
  payload: {
    recommendations?: string | null
    practiceToProficiency?: string | null
    briefingSummary?: string | null
  } | null
  attempts: number
}

const sendHomeworkEmail = async (params: {
  resendApiKey: string
  to: string
  studentName: string
  courseTitle: string
  lessonTitle: string | null
  recommendations: string | null
  practiceToProficiency: string | null
  briefingSummary: string | null
}) => {
  const subject = params.lessonTitle
    ? `Homework for Next Lesson: ${params.lessonTitle}`
    : `Homework for Your Next Lesson: ${params.courseTitle}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h1 style="color: #1e3a8a; margin-bottom: 8px;">Next Lesson Homework</h1>
      <p style="margin-top: 0; color: #4b5563;">Hi ${params.studentName}, here is your assigned preparation before the next lesson.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Course:</strong> ${params.courseTitle}</p>
        ${params.lessonTitle ? `<p style="margin: 0;"><strong>Upcoming Lesson:</strong> ${params.lessonTitle}</p>` : ''}
      </div>

      ${params.recommendations ? `<h3 style="margin-bottom: 6px;">Recommended Study and Practice</h3><p style="margin-top: 0; white-space: pre-wrap;">${params.recommendations}</p>` : ''}
      ${params.practiceToProficiency ? `<h3 style="margin-bottom: 6px;">Knowledge and Skills Needing Work</h3><p style="margin-top: 0; white-space: pre-wrap;">${params.practiceToProficiency}</p>` : ''}
      ${params.briefingSummary ? `<h3 style="margin-bottom: 6px;">Briefing Notes</h3><p style="margin-top: 0; white-space: pre-wrap;">${params.briefingSummary}</p>` : ''}

      <p style="margin-top: 24px; color: #4b5563;">Please practice these items to proficiency before your next flight, ground, or simulator event.</p>
    </div>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: [params.to],
      subject,
      html,
    }),
  })

  return response.ok
}

export const handler: Handler = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendApiKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase environment variables' }),
    }
  }

  if (!resendApiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({ processed: 0, message: 'RESEND_API_KEY not configured' }),
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const nowIso = new Date().toISOString()

  const queueResult = await supabaseAdmin
    .from('homework_email_queue')
    .select('id, lesson_evaluation_id, student_id, course_id, lesson_id, payload, attempts')
    .eq('status', 'pending')
    .lte('send_after_at', nowIso)
    .order('send_after_at', { ascending: true })
    .limit(25)

  if (queueResult.error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: queueResult.error.message }),
    }
  }

  const queueRows = (queueResult.data || []) as QueueRow[]
  if (queueRows.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ processed: 0 }),
    }
  }

  let processed = 0
  let sent = 0
  const failures: Array<{ id: string; error: string }> = []

  for (const row of queueRows) {
    processed += 1

    const [courseResult, lessonResult, studentResult] = await Promise.all([
      supabaseAdmin.from('courses').select('title').eq('id', row.course_id).single(),
      row.lesson_id
        ? supabaseAdmin.from('lessons').select('title').eq('id', row.lesson_id).single()
        : Promise.resolve({ data: null, error: null } as any),
      supabaseAdmin.auth.admin.getUserById(row.student_id),
    ])

    const studentEmail = studentResult.data.user?.email || null
    const studentName =
      (studentResult.data.user?.user_metadata?.full_name as string | undefined) ||
      studentEmail ||
      'Student'

    if (!studentEmail) {
      const errorMessage = 'Student email is missing'
      failures.push({ id: row.id, error: errorMessage })
      await supabaseAdmin
        .from('homework_email_queue')
        .update({
          status: 'failed',
          attempts: row.attempts + 1,
          last_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      continue
    }

    const delivered = await sendHomeworkEmail({
      resendApiKey,
      to: studentEmail,
      studentName,
      courseTitle: courseResult.data?.title || 'Your Course',
      lessonTitle: lessonResult.data?.title || null,
      recommendations: row.payload?.recommendations || null,
      practiceToProficiency: row.payload?.practiceToProficiency || null,
      briefingSummary: row.payload?.briefingSummary || null,
    })

    if (!delivered) {
      const errorMessage = 'Resend send failed'
      failures.push({ id: row.id, error: errorMessage })
      await supabaseAdmin
        .from('homework_email_queue')
        .update({
          status: 'failed',
          attempts: row.attempts + 1,
          last_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      continue
    }

    sent += 1
    await supabaseAdmin
      .from('homework_email_queue')
      .update({
        status: 'sent',
        attempts: row.attempts + 1,
        last_error: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ processed, sent, failed: failures.length, failures }),
  }
}
