"use client"

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
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
  email: string | null
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

const normalizeCourseTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/course|training/g, "")
    .replace(/[^a-z0-9]/g, "")

const getLineBounds = (text: string, cursor: number) => {
  const lineStart = text.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1
  const nextNewline = text.indexOf("\n", cursor)
  const lineEnd = nextNewline === -1 ? text.length : nextNewline
  return { lineStart, lineEnd }
}

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
  const [debriefPositiveObservations, setDebriefPositiveObservations] = useState("")
  const [debriefNegativeObservations, setDebriefNegativeObservations] = useState("")
  const [debriefReferenceMaterials, setDebriefReferenceMaterials] = useState("")
  const [debriefSkillsNeedingWork, setDebriefSkillsNeedingWork] = useState("")
  const [debriefRecommendedStudyPractice, setDebriefRecommendedStudyPractice] = useState("")
  const [debriefOtherFeedback, setDebriefOtherFeedback] = useState("")
  const [instructorPrivateNotes, setInstructorPrivateNotes] = useState("")
  const [sendEmail, setSendEmail] = useState(true)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [markCompletePulse, setMarkCompletePulse] = useState(false)
  const [justCompletedItemId, setJustCompletedItemId] = useState("")
  const [linkedSourceCourseIds, setLinkedSourceCourseIds] = useState<string[]>([])
  const [migratingEnrollments, setMigratingEnrollments] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const findNextOpenItemId = (drafts: Record<string, ItemDraft>) => {
    const next = syllabusItems.find((item) => (drafts[item.id]?.status || "not_started") !== "proficient")
    return next?.id || ""
  }

  const handleSmartListKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    value: string,
    setValue: Dispatch<SetStateAction<string>>
  ) => {
    const element = event.currentTarget
    const selectionStart = element.selectionStart
    const selectionEnd = element.selectionEnd
    const hasRangeSelection = selectionStart !== selectionEnd

    if (hasRangeSelection) return

    if (event.key === " ") {
      const { lineStart } = getLineBounds(value, selectionStart)
      const prefix = value.slice(lineStart, selectionStart)

      if (/^(\*|-)$/i.test(prefix)) {
        event.preventDefault()
        const nextValue = `${value.slice(0, lineStart)}• ${value.slice(selectionStart)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          element.selectionStart = lineStart + 2
          element.selectionEnd = lineStart + 2
        })
        return
      }

      if (/^\d+\.$/.test(prefix)) {
        event.preventDefault()
        const normalized = `${prefix} `
        const nextValue = `${value.slice(0, lineStart)}${normalized}${value.slice(selectionStart)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          element.selectionStart = lineStart + normalized.length
          element.selectionEnd = lineStart + normalized.length
        })
      }
      return
    }

    if (event.key === "Enter") {
      const { lineStart, lineEnd } = getLineBounds(value, selectionStart)
      const lineText = value.slice(lineStart, lineEnd)

      if (/^•\s$/.test(lineText) || /^\d+\.\s$/.test(lineText)) {
        event.preventDefault()
        const nextValue = `${value.slice(0, lineStart)}${value.slice(lineEnd)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          element.selectionStart = lineStart
          element.selectionEnd = lineStart
        })
        return
      }

      if (/^•\s/.test(lineText)) {
        event.preventDefault()
        const insertion = "\n• "
        const nextValue = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionStart)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          const nextCursor = selectionStart + insertion.length
          element.selectionStart = nextCursor
          element.selectionEnd = nextCursor
        })
        return
      }

      const orderedMatch = lineText.match(/^(\d+)\.\s/)
      if (orderedMatch) {
        event.preventDefault()
        const nextNumber = Number(orderedMatch[1]) + 1
        const insertion = `\n${nextNumber}. `
        const nextValue = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionStart)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          const nextCursor = selectionStart + insertion.length
          element.selectionStart = nextCursor
          element.selectionEnd = nextCursor
        })
      }
    }
  }

  const focusSyllabusItem = (itemId: string) => {
    setFocusedSyllabusItemId(itemId)
    requestAnimationFrame(() => {
      const element = document.getElementById(`syllabus-item-${itemId}`)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    })
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
      setLinkedSourceCourseIds([])
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

      let enrollmentRows = (enrollmentsResult.data as { student_id: string }[] | null) || []

      if (enrollmentRows.length === 0) {
        const selectedCourseRecord = courses.find((course) => course.id === selectedCourse)
        const normalizedSelected = selectedCourseRecord ? normalizeCourseTitle(selectedCourseRecord.title) : null
        const relatedCourseIds = normalizedSelected
          ? courses
              .filter((course) => course.id !== selectedCourse && normalizeCourseTitle(course.title) === normalizedSelected)
              .map((course) => course.id)
          : []

        if (relatedCourseIds.length > 0) {
          const { data: relatedEnrollmentData } = await supabase
            .from("enrollments")
            .select("student_id")
            .in("course_id", relatedCourseIds)

          const relatedEnrollmentRows = (relatedEnrollmentData as { student_id: string }[] | null) || []
          if (relatedEnrollmentRows.length > 0) {
            enrollmentRows = relatedEnrollmentRows
            setLinkedSourceCourseIds(relatedCourseIds)
            setStatusMessage("No enrollments on this course record yet. Showing students from a linked course record with the same name.")
          }
        }
      }

      const studentIds = Array.from(new Set(enrollmentRows.map((entry) => entry.student_id).filter(Boolean)))

      if (studentIds.length === 0) {
        setStudents([])
        setSelectedStudentId("")
        return
      }

      // Fetch students from students table instead of auth users for better name reliability
      let { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("user_id, email, full_name")
        .in("user_id", studentIds)
        .not("user_id", "is", null)
        .order("full_name", { ascending: true })

      if (studentsError) {
        setStatusMessage("Unable to load enrolled students")
        return
      }

      let students_list: StudentOption[] =
        (studentsData || [])
          .filter((row: any) => Boolean(row.user_id))
          .map((row: any) => ({
            id: row.user_id as string,
            email: row.email || null,
            full_name: row.full_name || null,
          }))

      const loadedIds = new Set(students_list.map((student) => student.id))
      let missingStudentIds = studentIds.filter((id) => !loadedIds.has(id))

      if (missingStudentIds.length > 0) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          await fetch("/api/admin/students/sync", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          const syncResult = await supabase
            .from("students")
            .select("user_id, email, full_name")
            .in("user_id", studentIds)
            .not("user_id", "is", null)
            .order("full_name", { ascending: true })

          if (!syncResult.error) {
            students_list =
              (syncResult.data || [])
                .filter((row: any) => Boolean(row.user_id))
                .map((row: any) => ({
                  id: row.user_id as string,
                  email: row.email || null,
                  full_name: row.full_name || null,
                }))
          }
        }

        const loadedAfterSync = new Set(students_list.map((student) => student.id))
        missingStudentIds = studentIds.filter((id) => !loadedAfterSync.has(id))

        if (missingStudentIds.length > 0) {
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", missingStudentIds)

          const profileById = new Map(
            ((profileRows as Array<{ id: string; full_name: string | null }> | null) || []).map((row) => [row.id, row.full_name])
          )

          const profileFallbacks: StudentOption[] = missingStudentIds.map((id) => ({
            id,
            email: null,
            full_name: profileById.get(id) || `Student (${id.slice(0, 8)})`,
          }))

          students_list = [...students_list, ...profileFallbacks]
          setStatusMessage("Some enrolled students were missing from the student registry. Fallback records are shown; run Normalize Student Records in Admin Enrollments to repair duplicate and incomplete student records.")
        }
      }

      students_list.sort((left, right) => {
        const leftName = (left.full_name || left.email || "").toLowerCase()
        const rightName = (right.full_name || right.email || "").toLowerCase()
        return leftName.localeCompare(rightName)
      })

      setStudents(students_list)
      if (!students_list.find((u) => u.id === selectedStudentId)) {
        setSelectedStudentId(students_list[0]?.id || "")
      }
    }

    fetchCourseData()
  }, [selectedCourse, selectedStudentId, reloadKey])

  const migrateLinkedEnrollments = async () => {
    if (!selectedCourse || linkedSourceCourseIds.length === 0) return

    setMigratingEnrollments(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("Missing admin session")
      }

      const response = await fetch("/api/admin/enrollments/migrate-course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetCourseId: selectedCourse,
          sourceCourseIds: linkedSourceCourseIds,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || "Unable to migrate enrollments")
      }

      setStatusMessage(`Enrollment migration complete. Inserted ${result.inserted || 0}, skipped ${result.skipped || 0}.`)
      setLinkedSourceCourseIds([])
      setReloadKey((previous) => previous + 1)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to migrate enrollments")
    } finally {
      setMigratingEnrollments(false)
    }
  }

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
          positiveObservations: debriefPositiveObservations,
          negativeObservations: debriefNegativeObservations,
          referenceMaterials: debriefReferenceMaterials,
          skillsNeedingWork: debriefSkillsNeedingWork,
          recommendedStudyPractice: debriefRecommendedStudyPractice,
          otherFeedback: debriefOtherFeedback,
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

      {linkedSourceCourseIds.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            background: "#FFFBEB",
            border: "1px solid #FCD34D",
            borderRadius: "10px",
            padding: "12px 14px",
            display: "grid",
            gap: "8px",
          }}
        >
          <p style={{ margin: 0, color: "#92400E", fontSize: "14px" }}>
            Students are currently loaded from linked course records with similar names. Migrate those enrollments into this selected course to permanently fix debrief visibility.
          </p>
          <button
            type="button"
            onClick={() => void migrateLinkedEnrollments()}
            disabled={migratingEnrollments}
            style={{
              justifySelf: "start",
              background: "#92400E",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "10px 14px",
              fontWeight: 600,
              cursor: "pointer",
              opacity: migratingEnrollments ? 0.7 : 1,
            }}
          >
            {migratingEnrollments ? "Migrating Enrollments..." : "Migrate Linked Enrollments to This Course"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        <section style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Lesson Evaluation</h2>
          <p style={{ marginTop: 0, color: "#6B7280", fontSize: "14px" }}>
            Student: {selectedStudent ? selectedStudent.full_name || selectedStudent.email : "Select a student"}
          </p>

          <form onSubmit={handleSubmitEvaluation} style={{ display: "grid", gap: "14px" }}>
            <div style={{ display: "grid", gap: "8px", padding: "10px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <label style={{ fontSize: "14px", fontWeight: 600 }}>Debriefed syllabus item</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                <select
                  value={focusedSyllabusItemId}
                  onChange={(e) => focusSyllabusItem(e.target.value)}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
                >
                  <option value="">Select syllabus item</option>
                  {syllabusItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({(itemDrafts[item.id]?.status || "not_started").replace(/_/g, " ")})
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
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                The selected debriefed syllabus item is linked to the highlighted card below and is the item auto-marked proficient on save.
              </p>
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
              <div key={item.id} id={`syllabus-item-${item.id}`}>
                {(() => {
                  const itemStatus = itemDrafts[item.id]?.status || "not_started"
                  const isProficient = itemStatus === "proficient"
                  const isFocused = focusedSyllabusItemId === item.id
                  const isJustCompleted = justCompletedItemId === item.id

                  return (
                    <div
                      onClick={() => setFocusedSyllabusItemId(item.id)}
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
                        cursor: "pointer",
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "10px" }}>
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
                onKeyDown={(e) => handleSmartListKeyDown(e, briefingFocusAreas, setBriefingFocusAreas)}
                placeholder="Areas of focus"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={2}
                value={briefingScenarios}
                onChange={(e) => setBriefingScenarios(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, briefingScenarios, setBriefingScenarios)}
                placeholder="Scenarios for this event"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={2}
                value={briefingPlannedRoute}
                onChange={(e) => setBriefingPlannedRoute(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, briefingPlannedRoute, setBriefingPlannedRoute)}
                placeholder="Planned route"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={2}
                value={briefingAdditionalInfo}
                onChange={(e) => setBriefingAdditionalInfo(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, briefingAdditionalInfo, setBriefingAdditionalInfo)}
                placeholder="Additional information to be prepared"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
            </div>

            <div style={{ display: "grid", gap: "10px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Debrief (shared with student)</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                Capture performance observations and action items tied to Merlin Flight Training materials, FAA sources, and/or ACS standards.
              </p>
              <textarea
                rows={3}
                value={debriefPositiveObservations}
                onChange={(e) => setDebriefPositiveObservations(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, debriefPositiveObservations, setDebriefPositiveObservations)}
                placeholder="Positive performance observations"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={3}
                value={debriefNegativeObservations}
                onChange={(e) => setDebriefNegativeObservations(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, debriefNegativeObservations, setDebriefNegativeObservations)}
                placeholder="Negative performance observations"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={3}
                value={debriefReferenceMaterials}
                onChange={(e) => setDebriefReferenceMaterials(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, debriefReferenceMaterials, setDebriefReferenceMaterials)}
                placeholder="References used (Merlin material, FAA source, ACS)"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={3}
                value={debriefSkillsNeedingWork}
                onChange={(e) => setDebriefSkillsNeedingWork(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, debriefSkillsNeedingWork, setDebriefSkillsNeedingWork)}
                placeholder="Knowledge and skills needing work before the next meeting"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={3}
                value={debriefRecommendedStudyPractice}
                onChange={(e) => setDebriefRecommendedStudyPractice(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, debriefRecommendedStudyPractice, setDebriefRecommendedStudyPractice)}
                placeholder="Recommended study and practice"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={3}
                value={debriefOtherFeedback}
                onChange={(e) => setDebriefOtherFeedback(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, debriefOtherFeedback, setDebriefOtherFeedback)}
                placeholder="Other feedback to help the student prepare for the next training event"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
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
                onKeyDown={(e) => handleSmartListKeyDown(e, instructorPrivateNotes, setInstructorPrivateNotes)}
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
