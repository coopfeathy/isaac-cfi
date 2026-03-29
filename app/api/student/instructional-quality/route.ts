import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

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
    const evaluationId = body?.evaluationId as string | undefined
    const rating = Number(body?.rating)
    const feedback = normalizeText(body?.feedback)

    if (!evaluationId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "A valid evaluationId and rating (1-5) are required" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: evaluation, error: evaluationError } = await supabaseAdmin
      .from("lesson_evaluations")
      .select("id, student_id, instructor_id, course_id, lesson_id")
      .eq("id", evaluationId)
      .single()

    if (evaluationError || !evaluation) {
      return NextResponse.json({ error: "Training event evaluation not found" }, { status: 404 })
    }

    if (evaluation.student_id !== user.id) {
      return NextResponse.json({ error: "You can only rate your own training events" }, { status: 403 })
    }

    const { error: upsertError } = await supabaseAdmin
      .from("lesson_instructional_quality_ratings")
      .upsert(
        [
          {
            lesson_evaluation_id: evaluation.id,
            student_id: user.id,
            instructor_id: evaluation.instructor_id,
            course_id: evaluation.course_id,
            lesson_id: evaluation.lesson_id,
            rating,
            feedback,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "lesson_evaluation_id,student_id" }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, rating, feedback })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
}
