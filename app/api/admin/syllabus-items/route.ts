import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) return null

  const token = authHeader.replace("Bearer ", "")
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.is_admin) return null

  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateAdmin(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const courseId = request.nextUrl.searchParams.get("courseId")
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from("syllabus_items")
      .select("id, course_id, title, description, stage, order_index, created_at")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data || [] })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateAdmin(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, title, description, stage } = body as {
      courseId: string
      title: string
      description?: string | null
      stage?: string | null
    }

    if (!courseId || !title?.trim()) {
      return NextResponse.json({ error: "courseId and title are required" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: maxRow } = await supabaseAdmin
      .from("syllabus_items")
      .select("order_index")
      .eq("course_id", courseId)
      .order("order_index", { ascending: false })
      .limit(1)
      .single()

    const nextIndex = (maxRow?.order_index ?? -1) + 1

    const { data, error } = await supabaseAdmin
      .from("syllabus_items")
      .insert({
        course_id: courseId,
        title: title.trim(),
        description: description?.trim() || null,
        stage: stage?.trim() || null,
        order_index: nextIndex,
        created_by: user.id,
      })
      .select("id, course_id, title, description, stage, order_index, created_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateAdmin(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, description, stage, order_index } = body as {
      id: string
      title?: string
      description?: string | null
      stage?: string | null
      order_index?: number
    }

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof title === "string") updates.title = title.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (stage !== undefined) updates.stage = stage?.trim() || null
    if (typeof order_index === "number") updates.order_index = order_index

    if (updates.title === "") {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from("syllabus_items")
      .update(updates)
      .eq("id", id)
      .select("id, course_id, title, description, stage, order_index, created_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateAdmin(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body as { id: string }

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from("syllabus_items")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
