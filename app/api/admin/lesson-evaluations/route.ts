import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { resend, emailTemplates } from "@/lib/resend"

type SyllabusUpdate = {
  syllabusItemId: string
  status: "not_started" | "introduced" | "practiced" | "proficient" | "needs_work"
  score?: number | null
  instructorNotes?: string | null
}

type BriefingNotesInput = {
  focusAreas?: string | null
  scenarios?: string | null
  plannedRoute?: string | null
  additionalInfo?: string | null
}

type DebriefInput = {
  positiveObservations?: string | null
  negativeObservations?: string | null
  referenceMaterials?: string | null
  skillsNeedingWork?: string | null
  recommendedStudyPractice?: string | null
  otherFeedback?: string | null
  satisfactory?: string | null
  unsatisfactory?: string | null
  deteriorating?: string | null
  recommendations?: string | null
  practiceToProficiency?: string | null
}

const normalizeText = (value?: string | null): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const buildLabeledBlock = (sections: Array<{ label: string; value: string | null }>): string | null => {
  const lines = sections
    .filter((section) => section.value)
    .map((section) => `${section.label}:\n${section.value}`)
  if (lines.length === 0) return null
  return lines.join("\n\n")
}

const sendHomeworkEmailNow = async (params: {
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
      performanceRating,
      briefingNotes,
      debrief,
      instructorPrivateNotes,
      strengths,
      improvements,
      homework,
      nextLessonFocus,
      syllabusUpdates,
      sendEmail,
    } = body as {
      courseId: string
      studentId: string
      lessonId?: string | null
      performanceRating: number
      briefingNotes?: BriefingNotesInput
      debrief?: DebriefInput
      instructorPrivateNotes?: string | null
      strengths?: string | null
      improvements?: string | null
      homework?: string | null
      nextLessonFocus?: string | null
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

    const debriefPositiveObservations =
      normalizeText(debrief?.positiveObservations) || normalizeText(debrief?.satisfactory) || normalizeText(strengths)
    const debriefNegativeObservations =
      normalizeText(debrief?.negativeObservations) || normalizeText(debrief?.unsatisfactory)
    const debriefReferenceMaterials =
      normalizeText(debrief?.referenceMaterials) || normalizeText(debrief?.deteriorating)
    const debriefSkillsNeedingWork =
      normalizeText(debrief?.skillsNeedingWork) || normalizeText(debrief?.practiceToProficiency)
    const debriefRecommendedStudyPractice =
      normalizeText(debrief?.recommendedStudyPractice) || normalizeText(debrief?.recommendations) || normalizeText(homework)
    const debriefOtherFeedback = normalizeText(debrief?.otherFeedback)

    const briefingSummary =
      buildLabeledBlock([
        { label: "Areas of Focus", value: normalizeText(briefingNotes?.focusAreas) },
        { label: "Scenarios", value: normalizeText(briefingNotes?.scenarios) },
        { label: "Planned Route", value: normalizeText(briefingNotes?.plannedRoute) },
        { label: "Additional Information", value: normalizeText(briefingNotes?.additionalInfo) },
      ]) || normalizeText(nextLessonFocus)

    const negativeAndReferences =
      buildLabeledBlock([
        { label: "Negative Observations", value: debriefNegativeObservations },
        { label: "References", value: debriefReferenceMaterials },
        { label: "Other Feedback", value: debriefOtherFeedback },
      ]) || normalizeText(improvements)

    const skillsAndBriefing = buildLabeledBlock([
      { label: "Knowledge and Skills Needing Work", value: debriefSkillsNeedingWork },
      { label: "Briefing Notes", value: briefingSummary },
    ])

    const progressRows = syllabusUpdates.map((item) => ({
      syllabus_item_id: item.syllabusItemId,
      student_id: studentId,
      status: item.status,
      score: item.score ?? null,
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
          improvements: negativeAndReferences,
          homework: debriefRecommendedStudyPractice,
          next_lesson_focus: skillsAndBriefing,
        },
      ])
      .select("id")
      .single()

    if (evaluationError) {
      return NextResponse.json({ error: evaluationError.message }, { status: 400 })
    }

    const homeworkPayload = {
      recommendations: debriefRecommendedStudyPractice,
      practiceToProficiency: debriefSkillsNeedingWork,
      briefingSummary,
    }

    const privateNotesValue = normalizeText(instructorPrivateNotes)
    let privateNotesSaved = false
    if (privateNotesValue) {
      const { error: privateNotesError } = await supabaseAdmin
        .from("lesson_evaluation_private_notes")
        .insert([
          {
            lesson_evaluation_id: evaluation.id,
            notes: privateNotesValue,
            instructor_id: user.id,
          },
        ])

      if (!privateNotesError) {
        privateNotesSaved = true
      }
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
          referenceMaterials: debriefReferenceMaterials,
          recommendedStudyPractice: debriefRecommendedStudyPractice,
          skillsNeedingWork: debriefSkillsNeedingWork,
          otherFeedback: debriefOtherFeedback,
          briefingSummary,
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
      privateNotesSaved,
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
