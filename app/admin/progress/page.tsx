"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type Course = {
  id: string
  title: string
}

type Lesson = {
  id: string
  title: string
}

type StudentOption = {
  id: string
  email: string
  full_name: string | null
}

type SyllabusItem = {
  id: string
  title: string
  description: string | null
  stage: string | null
  order_index: number
}

type ProgressRow = {
  syllabus_item_id: string
  status: SyllabusStatus
  score: number | null
  instructor_notes: string | null
}

type SyllabusStatus = "not_started" | "introduced" | "practiced" | "proficient" | "needs_work"

type ItemDraft = {
  status: SyllabusStatus
  score: number | ""
  instructorNotes: string
}

const STATUS_OPTIONS: SyllabusStatus[] = [
  "not_started",
  "introduced",
  "practiced",
  "proficient",
  "needs_work",
]

export default function AdminProgressPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")

  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([])
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({})

  const [newItemTitle, setNewItemTitle] = useState("")
  const [newItemDescription, setNewItemDescription] = useState("")
  const [newItemStage, setNewItemStage] = useState("")
  const [newItemOrder, setNewItemOrder] = useState(0)

  const [selectedLessonId, setSelectedLessonId] = useState("")
  const [performanceRating, setPerformanceRating] = useState(3)
  const [strengths, setStrengths] = useState("")
  const [improvements, setImprovements] = useState("")
  const [homework, setHomework] = useState("")
  const [nextLessonFocus, setNextLessonFocus] = useState("")
  const [sendEmail, setSendEmail] = useState(true)

  const [loading, setLoading] = useState(true)
  const [savingItem, setSavingItem] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      router.push("/login")
      return
    }

    const fetchCourses = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("title")

      if (!error) {
        setCourses(data || [])
        if (data && data.length > 0) {
          setSelectedCourse(data[0].id)
        }
      }
      setLoading(false)
    }

    fetchCourses()
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    if (!selectedCourse) return

    const fetchCourseData = async () => {
      setStatusMessage("")
      const [itemsResult, lessonsResult, enrollmentsResult] = await Promise.all([
        supabase
          .from("syllabus_items")
          .select("id, title, description, stage, order_index")
          .eq("course_id", selectedCourse)
          .order("order_index", { ascending: true }),
        supabase
          .from("lessons")
          .select("id, title, unit_id, units!inner(course_id)")
          .eq("units.course_id", selectedCourse)
          .order("title", { ascending: true }),
        supabase
          .from("enrollments")
          .select("student_id")
          .eq("course_id", selectedCourse),
      ])

      const items = (itemsResult.data as SyllabusItem[] | null) || []
      setSyllabusItems(items)
      setNewItemOrder(items.length + 1)

      const lessonRows = (lessonsResult.data as any[] | null) || []
      setLessons(
        lessonRows.map((row) => ({
          id: row.id,
          title: row.title,
        }))
      )

      const enrollmentRows = (enrollmentsResult.data as { student_id: string }[] | null) || []
      const studentIds = enrollmentRows.map((entry) => entry.student_id)

      if (studentIds.length === 0) {
        setStudents([])
        setSelectedStudentId("")
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setStatusMessage("Unable to load students. Please refresh and sign in again.")
        return
      }

      const usersResponse = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!usersResponse.ok) {
        setStatusMessage("Unable to load enrolled students")
        return
      }

      const usersJson = await usersResponse.json()
      const users: StudentOption[] = (usersJson.users || []).filter((u: StudentOption) => studentIds.includes(u.id))

      setStudents(users)
      if (!users.find((u) => u.id === selectedStudentId)) {
        setSelectedStudentId(users[0]?.id || "")
      }
    }

    fetchCourseData()
  }, [selectedCourse, selectedStudentId])

  useEffect(() => {
    if (!selectedStudentId || syllabusItems.length === 0) {
      setItemDrafts({})
      return
    }

    const fetchProgress = async () => {
      const { data } = await supabase
        .from("student_syllabus_progress")
        .select("syllabus_item_id, status, score, instructor_notes")
        .eq("student_id", selectedStudentId)
        .in(
          "syllabus_item_id",
          syllabusItems.map((item) => item.id)
        )

      const progressRows = (data as ProgressRow[] | null) || []
      const lookup: Record<string, ProgressRow> = {}
      progressRows.forEach((row) => {
        lookup[row.syllabus_item_id] = row
      })

      const nextDrafts: Record<string, ItemDraft> = {}
      syllabusItems.forEach((item) => {
        const existing = lookup[item.id]
        nextDrafts[item.id] = {
          status: existing?.status || "not_started",
          score: existing?.score || "",
          instructorNotes: existing?.instructor_notes || "",
        }
      })

      setItemDrafts(nextDrafts)
    }

    fetchProgress()
  }, [selectedStudentId, syllabusItems])

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [students, selectedStudentId]
  )

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse || !newItemTitle.trim()) return

    setSavingItem(true)
    setStatusMessage("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from("syllabus_items").insert([
      {
        course_id: selectedCourse,
        title: newItemTitle.trim(),
        description: newItemDescription.trim() || null,
        stage: newItemStage.trim() || null,
        order_index: newItemOrder,
        created_by: user?.id,
      },
    ])

    if (error) {
      setStatusMessage(`Failed to create syllabus item: ${error.message}`)
    } else {
      setStatusMessage("Syllabus item created")
      setNewItemTitle("")
      setNewItemDescription("")
      setNewItemStage("")
      setNewItemOrder((prev) => prev + 1)
      const { data } = await supabase
        .from("syllabus_items")
        .select("id, title, description, stage, order_index")
        .eq("course_id", selectedCourse)
        .order("order_index", { ascending: true })
      setSyllabusItems((data as SyllabusItem[] | null) || [])
    }

    setSavingItem(false)
  }

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse || !selectedStudentId || syllabusItems.length === 0) {
      setStatusMessage("Select a course, student, and syllabus items first")
      return
    }

    const syllabusUpdates = syllabusItems.map((item) => ({
      syllabusItemId: item.id,
      status: itemDrafts[item.id]?.status || "not_started",
      score: itemDrafts[item.id]?.score === "" ? null : Number(itemDrafts[item.id]?.score),
      instructorNotes: itemDrafts[item.id]?.instructorNotes || null,
    }))

    setSubmitting(true)
    setStatusMessage("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setStatusMessage("Missing session. Please sign in again.")
      setSubmitting(false)
      return
    }

    const response = await fetch("/api/admin/lesson-evaluations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        courseId: selectedCourse,
        studentId: selectedStudentId,
        lessonId: selectedLessonId || null,
        performanceRating,
        strengths,
        improvements,
        homework,
        nextLessonFocus,
        syllabusUpdates,
        sendEmail,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setStatusMessage(`Failed to save evaluation: ${result.error || "Unknown error"}`)
      setSubmitting(false)
      return
    }

    if (result.emailSent) {
      setStatusMessage("Evaluation saved and student email sent")
    } else if (sendEmail && result.emailError) {
      setStatusMessage(`Evaluation saved, but email failed: ${result.emailError}`)
    } else {
      setStatusMessage("Evaluation saved")
    }

    setSubmitting(false)
  }

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <AdminPageShell
      title="Syllabus Progress & Lesson Debriefs"
      description="Build custom syllabus checklists, capture lesson evaluations, and optionally email students after each debrief."
      backLinks={[{ href: "/admin", label: "Back to Admin" }, { href: "/admin/courses", label: "Back to Courses" }]}
      maxWidthClassName="max-w-6xl"
    >

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "15px" }}
        >
          <option value="">Select course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "15px" }}
        >
          <option value="">Select enrolled student</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name || student.email}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        <section style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ marginTop: 0 }}>1) Syllabus Builder</h2>
          <form onSubmit={handleCreateItem} style={{ display: "grid", gap: "10px", marginBottom: "20px" }}>
            <input
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="Item title (e.g. Slow Flight)"
              required
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
            />
            <input
              value={newItemStage}
              onChange={(e) => setNewItemStage(e.target.value)}
              placeholder="Stage (e.g. Pre-solo)"
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
            />
            <textarea
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
            />
            <input
              value={newItemOrder}
              onChange={(e) => setNewItemOrder(Number(e.target.value))}
              type="number"
              min={0}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "140px" }}
            />
            <button
              type="submit"
              disabled={savingItem || !selectedCourse}
              style={{
                background: "#C59A2A",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontWeight: 600,
                cursor: "pointer",
                width: "fit-content",
                opacity: savingItem || !selectedCourse ? 0.7 : 1,
              }}
            >
              {savingItem ? "Saving..." : "Add Syllabus Item"}
            </button>
          </form>

          {syllabusItems.length === 0 ? (
            <p style={{ color: "#6B7280" }}>No syllabus items for this course yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {syllabusItems.map((item) => (
                <div key={item.id} style={{ border: "1px solid #E5E7EB", borderRadius: "8px", padding: "10px" }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {item.order_index}. {item.title}
                  </p>
                  {item.stage && <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#6B7280" }}>Stage: {item.stage}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ marginTop: 0 }}>2) Lesson Evaluation</h2>
          <p style={{ marginTop: 0, color: "#6B7280", fontSize: "14px" }}>
            Student: {selectedStudent ? selectedStudent.full_name || selectedStudent.email : "Select a student"}
          </p>

          <form onSubmit={handleSubmitEvaluation} style={{ display: "grid", gap: "14px" }}>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
            >
              <option value="">No specific lesson</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>

            <label style={{ display: "grid", gap: "6px", fontSize: "14px" }}>
              Overall performance rating (1-5)
              <input
                type="number"
                min={1}
                max={5}
                value={performanceRating}
                onChange={(e) => setPerformanceRating(Number(e.target.value))}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "120px" }}
              />
            </label>

            {syllabusItems.map((item) => (
              <div key={item.id} style={{ border: "1px solid #E5E7EB", borderRadius: "10px", padding: "12px" }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>{item.title}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px", marginBottom: "10px" }}>
                  <select
                    value={itemDrafts[item.id]?.status || "not_started"}
                    onChange={(e) =>
                      setItemDrafts((prev) => ({
                        ...prev,
                        [item.id]: {
                          ...(prev[item.id] || { status: "not_started", score: "", instructorNotes: "" }),
                          status: e.target.value as SyllabusStatus,
                        },
                      }))
                    }
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    placeholder="Score"
                    value={itemDrafts[item.id]?.score ?? ""}
                    onChange={(e) =>
                      setItemDrafts((prev) => ({
                        ...prev,
                        [item.id]: {
                          ...(prev[item.id] || { status: "not_started", score: "", instructorNotes: "" }),
                          score: e.target.value ? Number(e.target.value) : "",
                        },
                      }))
                    }
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Instructor notes for this syllabus item"
                  value={itemDrafts[item.id]?.instructorNotes || ""}
                  onChange={(e) =>
                    setItemDrafts((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...(prev[item.id] || { status: "not_started", score: "", instructorNotes: "" }),
                        instructorNotes: e.target.value,
                      },
                    }))
                  }
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                />
              </div>
            ))}

            <textarea
              rows={3}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="What went well"
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
            />
            <textarea
              rows={3}
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="What to improve"
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
            />
            <textarea
              rows={3}
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Homework / prep for next lesson"
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
            />
            <textarea
              rows={2}
              value={nextLessonFocus}
              onChange={(e) => setNextLessonFocus(e.target.value)}
              placeholder="Next lesson focus"
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
            />

            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              Email debrief to student after save
            </label>

            <button
              type="submit"
              disabled={submitting || !selectedStudentId || syllabusItems.length === 0}
              style={{
                background: "#111827",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 18px",
                fontWeight: 600,
                cursor: "pointer",
                width: "fit-content",
                opacity: submitting || !selectedStudentId || syllabusItems.length === 0 ? 0.65 : 1,
              }}
            >
              {submitting ? "Saving..." : "Save Evaluation"}
            </button>
          </form>
        </section>
      </div>

      {statusMessage && (
        <div
          style={{
            marginTop: "16px",
            background: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: "10px",
            padding: "12px 14px",
            color: "#374151",
          }}
        >
          {statusMessage}
        </div>
      )}
    </AdminPageShell>
  )
}
