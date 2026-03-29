import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { resend } from "@/lib/resend"

type HomeworkAction = "send_now" | "hold"

const normalizeText = (value?: string | null): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const extractLabeledSection = (source: string | null | undefined, label: string): string | null => {
  if (!source) return null
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`${escapedLabel}:\\n([\\s\\S]*?)(?=\\n\\n[A-Za-z ]+:\\n|$)`, "i")
  const match = source.match(regex)
  if (!match?.[1]) return null
  return normalizeText(match[1])
}

const sendHomeworkEmail = async (params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
  studentId: string
  courseId: string
  lessonId?: string | null
  recommendations: string | null
  practiceToProficiency: string | null
  briefingSummary: string | null
}) => {
  const { supabaseAdmin, studentId, courseId, lessonId, recommendations, practiceToProficiency, briefingSummary } = params

  const [courseResult, lessonResult, studentResult] = await Promise.all([
    supabaseAdmin.from("courses").select("title").eq("id", courseId).single(),
    lessonId
      ? supabaseAdmin.from("lessons").select("title").eq("id", lessonId).single()
      : Promise.resolve({ data: null, error: null } as any),
    supabaseAdmin.auth.admin.getUserById(studentId),
  ])

  const studentEmail = studentResult.data.user?.email || null
  const studentName =
    (studentResult.data.user?.user_metadata?.full_name as string | undefined) ||
    studentEmail ||
    "Student"

  if (!studentEmail) {
    return { sent: false, error: "Student does not have an email on their account" }
  }

  const courseTitle = courseResult.data?.title || "Your Course"
  const lessonTitle = lessonResult.data?.title || null

  const subject = lessonTitle
    ? `Homework for Next Lesson: ${lessonTitle}`
    : `Homework for Your Next Lesson: ${courseTitle}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h1 style="color: #1e3a8a; margin-bottom: 8px;">Next Lesson Homework</h1>
      <p style="margin-top: 0; color: #4b5563;">Hi ${studentName}, here is your assigned preparation before the next lesson.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Course:</strong> ${courseTitle}</p>
        ${lessonTitle ? `<p style="margin: 0;"><strong>Upcoming Lesson:</strong> ${lessonTitle}</p>` : ""}
      </div>

      ${recommendations ? `<h3 style="margin-bottom: 6px;">Instructor Recommendations</h3><p style="margin-top: 0; white-space: pre-wrap;">${recommendations}</p>` : ""}
      ${practiceToProficiency ? `<h3 style="margin-bottom: 6px;">Practice To Proficiency</h3><p style="margin-top: 0; white-space: pre-wrap;">${practiceToProficiency}</p>` : ""}
      ${briefingSummary ? `<h3 style="margin-bottom: 6px;">Briefing Notes</h3><p style="margin-top: 0; white-space: pre-wrap;">${briefingSummary}</p>` : ""}

      <p style="margin-top: 24px; color: #4b5563;">Please practice these items to proficiency before your next flight, ground, or simulator event.</p>
    </div>
  `

  const { error } = await resend.emails.send({
    from: "Merlin Flight Training <noreply@merlinflighttraining.com>",
    to: [studentEmail],
    subject,
    html,
  })

  if (error) {
    return { sent: false, error: error.message || "Failed to send homework email" }
  }

  return { sent: true, error: null as string | null }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_admin")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const action = body?.action as HomeworkAction
    const evaluationId = body?.evaluationId as string

    if (!evaluationId || (action !== "send_now" && action !== "hold")) {
      return NextResponse.json({ error: "Invalid action or evaluation ID" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: evaluation, error: evaluationError } = await supabaseAdmin
      .from("lesson_evaluations")
      .select("id, student_id, course_id, lesson_id, homework, next_lesson_focus")
      .eq("id", evaluationId)
      .single()

    if (evaluationError || !evaluation) {
      return NextResponse.json({ error: "Lesson evaluation not found" }, { status: 404 })
    }

    const practiceToProficiency =
      extractLabeledSection(evaluation.next_lesson_focus, "Practice to Proficiency") ||
      normalizeText(evaluation.next_lesson_focus)
    const briefingSummary = extractLabeledSection(evaluation.next_lesson_focus, "Briefing Notes")

    const payload = {
      recommendations: normalizeText(evaluation.homework),
      practiceToProficiency,
      briefingSummary,
    }

    if (action === "hold") {
      const { error } = await supabaseAdmin
        .from("homework_email_queue")
        .upsert(
          [
            {
              lesson_evaluation_id: evaluation.id,
              student_id: evaluation.student_id,
              course_id: evaluation.course_id,
              lesson_id: evaluation.lesson_id,
              payload,
              status: "held",
              send_after_at: null,
              held_at: new Date().toISOString(),
              sent_at: null,
              sent_by: null,
              last_error: null,
              created_by: user.id,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "lesson_evaluation_id" }
        )

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, status: "held" })
    }

    const sendResult = await sendHomeworkEmail({
      supabaseAdmin,
      studentId: evaluation.student_id,
      courseId: evaluation.course_id,
      lessonId: evaluation.lesson_id,
      recommendations: payload.recommendations,
      practiceToProficiency: payload.practiceToProficiency,
      briefingSummary: payload.briefingSummary,
    })

    if (!sendResult.sent) {
      await supabaseAdmin
        .from("homework_email_queue")
        .upsert(
          [
            {
              lesson_evaluation_id: evaluation.id,
              student_id: evaluation.student_id,
              course_id: evaluation.course_id,
              lesson_id: evaluation.lesson_id,
              payload,
              status: "failed",
              send_after_at: null,
              held_at: null,
              sent_at: null,
              sent_by: null,
              attempts: 1,
              last_error: sendResult.error,
              created_by: user.id,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "lesson_evaluation_id" }
        )

      return NextResponse.json({ error: sendResult.error || "Failed to send homework email" }, { status: 400 })
    }

    const { error: sentError } = await supabaseAdmin
      .from("homework_email_queue")
      .upsert(
        [
          {
            lesson_evaluation_id: evaluation.id,
            student_id: evaluation.student_id,
            course_id: evaluation.course_id,
            lesson_id: evaluation.lesson_id,
            payload,
            status: "sent",
            send_after_at: null,
            held_at: null,
            sent_at: new Date().toISOString(),
            sent_by: user.id,
            attempts: 1,
            last_error: null,
            created_by: user.id,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "lesson_evaluation_id" }
      )

    if (sentError) {
      return NextResponse.json({ error: sentError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, status: "sent" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
