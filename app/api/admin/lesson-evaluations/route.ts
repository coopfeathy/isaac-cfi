import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { resend, emailTemplates } from "@/lib/resend"

type SyllabusUpdate = {
  syllabusItemId: string
  status: "proficient" | "needs_work"
  instructorNotes?: string | null
}

type DebriefInput = {
  positiveObservations?: string | null
  negativeObservations?: string | null
  recommendedStudyPractice?: string | null
}

const normalizeText = (value?: string | null): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
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

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, is_admin")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const {
      courseId,
      studentId,
      lessonId,
      syllabusItemTitle,
      performanceRating,
      debrief,
      strengths,
      improvements,
      homework,
      syllabusUpdates,
      sendEmail,
    } = body as {
      courseId: string
      studentId: string
      lessonId?: string | null
      syllabusItemTitle?: string | null
      performanceRating: number
      debrief?: DebriefInput
      strengths?: string | null
      improvements?: string | null
      homework?: string | null
      syllabusUpdates: SyllabusUpdate[]
      sendEmail?: boolean
    }

    if (!courseId || !studentId || !performanceRating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!Array.isArray(syllabusUpdates) || syllabusUpdates.length === 0) {
      return NextResponse.json({ error: "Provide at least one syllabus update" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const debriefPositiveObservations = normalizeText(debrief?.positiveObservations) || normalizeText(strengths)
    const debriefNegativeObservations = normalizeText(debrief?.negativeObservations) || normalizeText(improvements)
    const debriefRecommendedStudyPractice = normalizeText(debrief?.recommendedStudyPractice) || normalizeText(homework)
    const focusedSyllabusSummary = normalizeText(syllabusItemTitle)

    const progressRows = syllabusUpdates.map((item) => ({
      syllabus_item_id: item.syllabusItemId,
      student_id: studentId,
      status: item.status,
      instructor_notes: item.instructorNotes || null,
      last_evaluated_at: new Date().toISOString(),
      evaluated_by: user.id,
    }))

    const { error: progressError } = await supabaseAdmin
      .from("student_syllabus_progress")
      .upsert(progressRows, { onConflict: "syllabus_item_id,student_id" })

    if (progressError) {
      return NextResponse.json({ error: progressError.message }, { status: 400 })
    }

    const { data: evaluation, error: evaluationError } = await supabaseAdmin
      .from("lesson_evaluations")
      .insert([
        {
          course_id: courseId,
          lesson_id: lessonId || null,
          student_id: studentId,
          instructor_id: user.id,
          performance_rating: performanceRating,
          strengths: debriefPositiveObservations,
          improvements: debriefNegativeObservations,
          homework: debriefRecommendedStudyPractice,
          next_lesson_focus: focusedSyllabusSummary,
        },
      ])
      .select("id")
      .single()

    if (evaluationError) {
      return NextResponse.json({ error: evaluationError.message }, { status: 400 })
    }

    const homeworkPayload = {
      recommendations: debriefRecommendedStudyPractice,
      practiceToProficiency: null,
      briefingSummary: null,
    }

    let emailSent = false
    let emailError: string | null = null

    if (sendEmail) {
      const [courseResult, lessonResult, progressResult, studentResult] = await Promise.all([
        supabaseAdmin.from("courses").select("title").eq("id", courseId).single(),
        lessonId
          ? supabaseAdmin.from("lessons").select("title").eq("id", lessonId).single()
          : Promise.resolve({ data: null, error: null } as any),
        supabaseAdmin
          .from("student_syllabus_progress")
          .select("status, syllabus_items!inner(title, course_id)")
          .eq("student_id", studentId)
          .eq("syllabus_items.course_id", courseId),
        supabaseAdmin.auth.admin.getUserById(studentId),
      ])

      const courseTitle = courseResult.data?.title || "Your Course"
      const lessonTitle = lessonResult.data?.title || null
      const studentEmail = studentResult.data.user?.email || null
      const studentName =
        (studentResult.data.user?.user_metadata?.full_name as string | undefined) ||
        studentEmail ||
        "Student"

      if (studentEmail) {
        const progressSummary =
          progressResult.data?.map((row: any) => ({
            title: row.syllabus_items?.title || "Syllabus Item",
            status: row.status,
          })) || []

        const template = emailTemplates.lessonEvaluation({
          studentName,
          courseTitle,
          lessonTitle,
          performanceRating,
          positiveObservations: debriefPositiveObservations,
          negativeObservations: debriefNegativeObservations,
          recommendedStudyPractice: debriefRecommendedStudyPractice,
          progressSummary,
        })

        const { error } = await resend.emails.send({
          from: "Merlin Flight Training <noreply@merlinflighttraining.com>",
          to: [studentEmail],
          subject: template.subject,
          html: template.html,
        })

        if (error) {
          emailError = error.message || "Failed to send email"
        } else {
          emailSent = true
          await supabaseAdmin
            .from("lesson_evaluations")
            .update({
              email_sent_to: studentEmail,
              email_sent_at: new Date().toISOString(),
            })
            .eq("id", evaluation.id)
        }
      } else {
        emailError = "Student does not have an email on their account"
      }
    }

    return NextResponse.json({
      success: true,
      evaluationId: evaluation.id,
      privateNotesSaved: false,
      emailSent,
      emailError,
      homeworkEmailStatus: "queued_on_completion",
      homeworkEmailError: null,
      homeworkQueuedFor: null,
      homeworkPayloadReady: Boolean(homeworkPayload.recommendations || homeworkPayload.practiceToProficiency || homeworkPayload.briefingSummary),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
