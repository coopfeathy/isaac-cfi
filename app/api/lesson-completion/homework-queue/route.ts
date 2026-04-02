import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const HOMEWORK_EMAIL_DELAY_MINUTES = Number(process.env.HOMEWORK_EMAIL_DELAY_MINUTES || "60")

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

    const body = await request.json()
    const lessonId = body?.lessonId as string | undefined
    const courseId = body?.courseId as string | undefined

    if (!lessonId || !courseId) {
      return NextResponse.json({ error: "Missing lessonId or courseId" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle()

    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 400 })
    }

    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 })
    }

    const { data: evaluation, error: evaluationError } = await supabaseAdmin
      .from("lesson_evaluations")
      .select("id, student_id, instructor_id, course_id, lesson_id, homework, next_lesson_focus")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (evaluationError) {
      return NextResponse.json({ error: evaluationError.message }, { status: 400 })
    }

    if (!evaluation) {
      return NextResponse.json({ success: true, queued: false, reason: "No lesson evaluation found yet" })
    }

    const { data: existingQueue, error: queueReadError } = await supabaseAdmin
      .from("homework_email_queue")
      .select("status")
      .eq("lesson_evaluation_id", evaluation.id)
      .maybeSingle()

    if (queueReadError) {
      return NextResponse.json({ error: queueReadError.message }, { status: 400 })
    }

    if (existingQueue?.status === "sent" || existingQueue?.status === "held" || existingQueue?.status === "pending") {
      return NextResponse.json({ success: true, queued: false, status: existingQueue.status })
    }

    const payload = {
      recommendations: normalizeText(evaluation.homework),
      practiceToProficiency: null,
      briefingSummary: null,
    }

    const delayMs = Math.max(5, HOMEWORK_EMAIL_DELAY_MINUTES) * 60 * 1000
    const queuedSendAt = new Date(Date.now() + delayMs).toISOString()

    const { error: queueWriteError } = await supabaseAdmin
      .from("homework_email_queue")
      .upsert(
        [
          {
            lesson_evaluation_id: evaluation.id,
            student_id: user.id,
            course_id: courseId,
            lesson_id: lessonId,
            payload,
            status: "pending",
            send_after_at: queuedSendAt,
            held_at: null,
            sent_at: null,
            sent_by: null,
            last_error: null,
            created_by: evaluation.instructor_id,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "lesson_evaluation_id" }
      )

    if (queueWriteError) {
      return NextResponse.json({ error: queueWriteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, queued: true, status: "pending", sendAfterAt: queuedSendAt })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
}
