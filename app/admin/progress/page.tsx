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
  const [focusedSyllabusItemId, setFocusedSyllabusItemId] = useState("")

  const [selectedLessonId, setSelectedLessonId] = useState("")
  const [performanceRating, setPerformanceRating] = useState(3)
  const [briefingFocusAreas, setBriefingFocusAreas] = useState("")
  const [briefingScenarios, setBriefingScenarios] = useState("")
  const [briefingPlannedRoute, setBriefingPlannedRoute] = useState("")
  const [briefingAdditionalInfo, setBriefingAdditionalInfo] = useState("")
  const [debriefSatisfactory, setDebriefSatisfactory] = useState("")
  const [debriefUnsatisfactory, setDebriefUnsatisfactory] = useState("")
  const [debriefDeteriorating, setDebriefDeteriorating] = useState("")
  const [instructorRecommendations, setInstructorRecommendations] = useState("")
  const [studentPracticeToProficiency, setStudentPracticeToProficiency] = useState("")
  const [instructorPrivateNotes, setInstructorPrivateNotes] = useState("")
  const [sendEmail, setSendEmail] = useState(true)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [markCompletePulse, setMarkCompletePulse] = useState(false)
  const [justCompletedItemId, setJustCompletedItemId] = useState("")

  const findNextOpenItemId = (drafts: Record<string, ItemDraft>) => {
    const next = syllabusItems.find((item) => (drafts[item.id]?.status || "not_started") !== "proficient")
    return next?.id || ""
  }

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
      setFocusedSyllabusItemId((current) => (current && items.some((item) => item.id === current) ? current : items[0]?.id || ""))

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

      // Fetch students from students table instead of auth users for better name reliability
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, email, full_name")
        .in("id", studentIds)
        .order("full_name", { ascending: true })

      if (studentsError) {
        setStatusMessage("Unable to load enrolled students")
        return
      }

      const students_list: StudentOption[] = studentsData || []
      setStudents(students_list)
      if (!students_list.find((u) => u.id === selectedStudentId)) {
        setSelectedStudentId(students_list[0]?.id || "")
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
      setFocusedSyllabusItemId((current) => {
        if (current && syllabusItems.some((item) => item.id === current)) return current
        return findNextOpenItemId(nextDrafts) || syllabusItems[0]?.id || ""
      })
    }

    fetchProgress()
  }, [selectedStudentId, syllabusItems])

  const handleMarkFocusedComplete = () => {
    if (!focusedSyllabusItemId) return

    const completedItemId = focusedSyllabusItemId
    setMarkCompletePulse(true)
    setJustCompletedItemId(completedItemId)
    setTimeout(() => setMarkCompletePulse(false), 220)
    setTimeout(() => setJustCompletedItemId((current) => (current === completedItemId ? "" : current)), 1600)

    setItemDrafts((previous) => {
      const nextDrafts: Record<string, ItemDraft> = {
        ...previous,
        [completedItemId]: {
          ...(previous[completedItemId] || {
            status: "not_started",
            score: "",
            instructorNotes: "",
          }),
          status: "proficient",
        },
      }

      const currentIndex = syllabusItems.findIndex((item) => item.id === completedItemId)
      const nextItem = syllabusItems
        .slice(currentIndex + 1)
        .find((item) => (nextDrafts[item.id]?.status || "not_started") !== "proficient")

      if (nextItem) {
        setFocusedSyllabusItemId(nextItem.id)
      }

      return nextDrafts
    })
  }

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [students, selectedStudentId]
  )

  const handleSubmitEvaluation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedCourse || !selectedStudentId || syllabusItems.length === 0) {
      setStatusMessage("Select a course, student, and syllabus items first")
      return
    }

    const nextDrafts: Record<string, ItemDraft> = { ...itemDrafts }
    if (focusedSyllabusItemId) {
      const focused = nextDrafts[focusedSyllabusItemId]
      if (focused && focused.status !== "proficient") {
        nextDrafts[focusedSyllabusItemId] = {
          ...focused,
          status: "proficient",
        }
      }
    }

    const syllabusUpdates = syllabusItems.map((item) => ({
      syllabusItemId: item.id,
      status: nextDrafts[item.id]?.status || "not_started",
      score: nextDrafts[item.id]?.score === "" ? null : Number(nextDrafts[item.id]?.score),
      instructorNotes: nextDrafts[item.id]?.instructorNotes || null,
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
        briefingNotes: {
          focusAreas: briefingFocusAreas,
          scenarios: briefingScenarios,
          plannedRoute: briefingPlannedRoute,
          additionalInfo: briefingAdditionalInfo,
        },
        debrief: {
          satisfactory: debriefSatisfactory,
          unsatisfactory: debriefUnsatisfactory,
          deteriorating: debriefDeteriorating,
          recommendations: instructorRecommendations,
          practiceToProficiency: studentPracticeToProficiency,
        },
        instructorPrivateNotes,
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

    const statusParts: string[] = ["Evaluation saved"]

    if (result.emailSent) {
      statusParts.push("debrief email sent")
    } else if (sendEmail && result.emailError) {
      statusParts.push(`debrief email failed: ${result.emailError}`)
    }

    if (result.homeworkEmailStatus === "queued_on_completion") {
      statusParts.push("homework email will queue when the student completes the lesson")
    } else if (result.homeworkEmailStatus === "pending") {
      statusParts.push(
        result.homeworkQueuedFor
          ? `homework email queued for ${new Date(result.homeworkQueuedFor).toLocaleString()}`
          : "homework email queued"
      )
    } else if (result.homeworkEmailStatus === "failed") {
      statusParts.push(`homework email failed: ${result.homeworkEmailError || "Unknown error"}`)
    }

    setStatusMessage(statusParts.join(" | "))

    setItemDrafts(nextDrafts)
    setFocusedSyllabusItemId(findNextOpenItemId(nextDrafts))

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
      title="Lesson Evaluations & Student Debriefs"
      description="Capture lesson evaluations, track syllabus progress, and send students feedback on their training flights."
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
          <h2 style={{ marginTop: 0 }}>Lesson Evaluation</h2>
          <p style={{ marginTop: 0, color: "#6B7280", fontSize: "14px" }}>
            Student: {selectedStudent ? selectedStudent.full_name || selectedStudent.email : "Select a student"}
          </p>

          <form onSubmit={handleSubmitEvaluation} style={{ display: "grid", gap: "14px" }}>
            <div style={{ display: "grid", gap: "8px", padding: "10px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <label style={{ fontSize: "14px", fontWeight: 600 }}>Debriefed syllabus item</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
                <select
                  value={focusedSyllabusItemId}
                  onChange={(e) => setFocusedSyllabusItemId(e.target.value)}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
                >
                  <option value="">Select syllabus item</option>
                  {syllabusItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleMarkFocusedComplete}
                  style={{
                    background: "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transform: markCompletePulse ? "translateY(1px) scale(0.97)" : "translateY(0) scale(1)",
                    boxShadow: markCompletePulse ? "inset 0 2px 8px rgba(0,0,0,0.18)" : "0 2px 6px rgba(16, 185, 129, 0.25)",
                    transition: "transform 180ms ease, box-shadow 180ms ease",
                  }}
                >
                  {markCompletePulse ? "Marked" : "Mark Complete"}
                </button>
              </div>
            </div>

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

            <div style={{ display: "grid", gap: "10px", fontSize: "14px" }}>
              <label style={{ fontWeight: 600 }}>Event Performance Grade</label>
              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  { value: 4, label: "Above Average", arrows: "⬆️⬆️", description: "Consistently meeting or exceeding standards" },
                  { value: 3, label: "Slightly Above Average", arrows: "⬆️", description: "Meeting most expectations" },
                  { value: 2, label: "Slightly Below Average", arrows: "⬇️", description: "Uncertain if they will meet standards" },
                  { value: 1, label: "Below Average", arrows: "⬇️⬇️", description: "Unlikely to meet standards" },
                ].map((grade) => (
                  <label key={grade.value} style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", padding: "10px", borderRadius: "8px", border: performanceRating === grade.value ? "2px solid #C59A2A" : "1px solid #E5E7EB", background: performanceRating === grade.value ? "#FFFBEB" : "#F9FAFB" }}>
                    <input
                      type="radio"
                      name="performance-grade"
                      value={grade.value}
                      checked={performanceRating === grade.value}
                      onChange={(e) => setPerformanceRating(Number(e.target.value))}
                      style={{ marginTop: "4px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                        {grade.arrows} {grade.label}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6B7280" }}>{grade.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {syllabusItems.map((item) => (
              <div key={item.id}>
                {(() => {
                  const itemStatus = itemDrafts[item.id]?.status || "not_started"
                  const isProficient = itemStatus === "proficient"
                  const isFocused = focusedSyllabusItemId === item.id
                  const isJustCompleted = justCompletedItemId === item.id

                  return (
                    <div
                      style={{
                        border: isProficient
                          ? "2px solid #059669"
                          : isFocused
                          ? "2px solid #C59A2A"
                          : "1px solid #E5E7EB",
                        background: isProficient ? "#ECFDF5" : isFocused ? "#FFFBEB" : "#FFFFFF",
                        borderRadius: "10px",
                        padding: "12px",
                        boxShadow: isJustCompleted ? "0 0 0 3px rgba(16,185,129,0.25)" : "none",
                        transition: "background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{item.title}</p>
                        {isProficient && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              color: "#065F46",
                              background: "#D1FAE5",
                              border: "1px solid #6EE7B7",
                              borderRadius: "999px",
                              padding: "3px 8px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            COMPLETE
                          </span>
                        )}
                      </div>
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
                  )
                })()}
              </div>
            ))}

            <div style={{ display: "grid", gap: "10px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Briefing Notes (shared with student)</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                Add what the student should expect before the scheduled flight, ground, or simulator event.
              </p>
              <textarea
                rows={2}
                value={briefingFocusAreas}
                onChange={(e) => setBriefingFocusAreas(e.target.value)}
                placeholder="Areas of focus"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={2}
                value={briefingScenarios}
                onChange={(e) => setBriefingScenarios(e.target.value)}
                placeholder="Scenarios for this event"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={2}
                value={briefingPlannedRoute}
                onChange={(e) => setBriefingPlannedRoute(e.target.value)}
                placeholder="Planned route"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={2}
                value={briefingAdditionalInfo}
                onChange={(e) => setBriefingAdditionalInfo(e.target.value)}
                placeholder="Additional information to be prepared"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
            </div>

            <div style={{ display: "grid", gap: "10px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Debrief (shared with student)</p>
              <textarea
                rows={3}
                value={debriefSatisfactory}
                onChange={(e) => setDebriefSatisfactory(e.target.value)}
                placeholder="Satisfactory"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={3}
                value={debriefUnsatisfactory}
                onChange={(e) => setDebriefUnsatisfactory(e.target.value)}
                placeholder="Unsatisfactory"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={3}
                value={debriefDeteriorating}
                onChange={(e) => setDebriefDeteriorating(e.target.value)}
                placeholder="Deteriorating"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <textarea
                rows={3}
                value={instructorRecommendations}
                onChange={(e) => setInstructorRecommendations(e.target.value)}
                placeholder="Instructor recommendations for practice"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
              />
              <textarea
                rows={3}
                value={studentPracticeToProficiency}
                onChange={(e) => setStudentPracticeToProficiency(e.target.value)}
                placeholder="Student practice-to-proficiency before next flight/simulator event"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              Email debrief to student after save
            </label>

            <div style={{ display: "grid", gap: "8px", padding: "10px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <label style={{ fontWeight: 600 }}>Instructor Notes (WILL NOT BE SHARED WITH STUDENT)</label>
              <textarea
                rows={3}
                value={instructorPrivateNotes}
                onChange={(e) => setInstructorPrivateNotes(e.target.value)}
                placeholder="Internal instructor notes"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                Homework email behavior after lesson completion.
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                Email queueing is triggered when the student completes the lesson. Manual push/hold remains available in the Students workspace.
              </p>
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
                  opacity: submitting || !selectedStudentId || syllabusItems.length === 0 ? 0.65 : 1,
                  justifySelf: "start",
                }}
              >
                {submitting ? "Saving..." : "Save Lesson Evaluation"}
              </button>
            </div>
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
