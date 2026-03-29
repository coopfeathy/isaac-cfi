"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import LearningHubLayout from "@/app/components/LearningHubLayout"

type Course = {
  id: string
  title: string
  description: string | null
}

type SyllabusItem = {
  id: string
  course_id: string
  title: string
  stage: string | null
  order_index: number
}

type SyllabusProgress = {
  syllabus_item_id: string
  status: "not_started" | "introduced" | "practiced" | "proficient" | "needs_work"
  score: number | null
  instructor_notes: string | null
  updated_at: string
}

type LessonEvaluation = {
  id: string
  created_at: string
  performance_rating: number
  strengths: string | null
  improvements: string | null
  homework: string | null
  next_lesson_focus: string | null
  course_id: string
  lesson_id: string | null
}

type Lesson = {
  id: string
  title: string
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  introduced: "Introduced",
  practiced: "Practiced",
  proficient: "Proficient",
  needs_work: "Needs work",
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "#9CA3AF",
  introduced: "#3B82F6",
  practiced: "#C59A2A",
  proficient: "#10B981",
  needs_work: "#EF4444",
}

const getGradeLabel = (rating: number): { arrows: string; label: string; color: string } => {
  switch (rating) {
    case 4:
      return { arrows: "⬆️⬆️", label: "Above Average", color: "#10B981" }
    case 3:
      return { arrows: "⬆️", label: "Slightly Above Average", color: "#3B82F6" }
    case 2:
      return { arrows: "⬇️", label: "Slightly Below Average", color: "#F59E0B" }
    case 1:
      return { arrows: "⬇️⬇️", label: "Below Average", color: "#EF4444" }
    default:
      return { arrows: "—", label: "Not Rated", color: "#6B7280" }
  }
}

const extractLabeledSection = (source: string | null | undefined, label: string): string | null => {
  if (!source) return null
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`${escapedLabel}:\\n([\\s\\S]*?)(?=\\n\\n[A-Za-z ]+:\\n|$)`, "i")
  const match = source.match(regex)
  if (!match?.[1]) return null
  const value = match[1].trim()
  return value.length > 0 ? value : null
}

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [items, setItems] = useState<SyllabusItem[]>([])
  const [progress, setProgress] = useState<SyllabusProgress[]>([])
  const [evaluations, setEvaluations] = useState<LessonEvaluation[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      setLoading(true)

      const enrollmentsResult = await supabase
        .from("enrollments")
        .select("course_id, courses!inner(id, title, description)")
        .eq("student_id", user.id)

      const enrolledCourses: Course[] =
        enrollmentsResult.data?.map((entry: any) => ({
          id: entry.courses.id,
          title: entry.courses.title,
          description: entry.courses.description,
        })) || []

      const courseIds = enrolledCourses.map((course) => course.id)

      if (courseIds.length === 0) {
        setCourses([])
        setItems([])
        setProgress([])
        setEvaluations([])
        setLessons([])
        setLoading(false)
        return
      }

      const [itemsResult, progressResult, evaluationsResult, lessonsResult] = await Promise.all([
        supabase
          .from("syllabus_items")
          .select("id, course_id, title, stage, order_index")
          .in("course_id", courseIds)
          .order("order_index", { ascending: true }),
        supabase
          .from("student_syllabus_progress")
          .select("syllabus_item_id, status, score, instructor_notes, updated_at")
          .eq("student_id", user.id),
        supabase
          .from("lesson_evaluations")
          .select(
            "id, created_at, performance_rating, strengths, improvements, homework, next_lesson_focus, course_id, lesson_id"
          )
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("lessons")
          .select("id, title")
          .order("title", { ascending: true }),
      ])

      setCourses(enrolledCourses)
      setItems((itemsResult.data as SyllabusItem[] | null) || [])
      setProgress((progressResult.data as SyllabusProgress[] | null) || [])
      setEvaluations((evaluationsResult.data as LessonEvaluation[] | null) || [])
      setLessons((lessonsResult.data as Lesson[] | null) || [])
      setLoading(false)
    }

    fetchData()
  }, [user])

  const progressLookup = useMemo(() => {
    const map: Record<string, SyllabusProgress> = {}
    progress.forEach((entry) => {
      map[entry.syllabus_item_id] = entry
    })
    return map
  }, [progress])

  const lessonLookup = useMemo(() => {
    const map: Record<string, string> = {}
    lessons.forEach((lesson) => {
      map[lesson.id] = lesson.title
    })
    return map
  }, [lessons])

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 16px" }}>
        <p>Loading progress...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "36px 16px" }}>
        <h1>My Progress</h1>
        <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "10px", padding: "16px" }}>
          <p style={{ margin: 0 }}>
            Please sign in to view your training progress. <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  const totalItems = items.length
  const proficientItems = items.filter((item) => progressLookup[item.id]?.status === "proficient").length
  const overallCompletion = totalItems > 0 ? Math.round((proficientItems / totalItems) * 100) : 0

  return (
    <LearningHubLayout
      title="Performance and Checkride Readiness"
      subtitle="See where you are strong, what still needs work, and what to focus on before your next evaluation flight."
      activeTab="progress"
      headerVariant="schedule"
      stats={[
        { label: "Enrolled Courses", value: String(courses.length) },
        { label: "Proficient Items", value: `${proficientItems}/${totalItems || 0}` },
        { label: "Overall Completion", value: `${overallCompletion}%` },
      ]}
    >

      {courses.length === 0 ? (
        <div style={{ background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: "10px", padding: "20px" }}>
          <p style={{ margin: 0 }}>No courses assigned yet. Ask your instructor to enroll you.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "18px" }}>
          {courses.map((course) => {
            const courseItems = items
              .filter((item) => item.course_id === course.id)
              .sort((a, b) => a.order_index - b.order_index)

            const completedCount = courseItems.filter((item) => {
              const status = progressLookup[item.id]?.status
              return status === "proficient"
            }).length

            const completionPercent =
              courseItems.length > 0 ? Math.round((completedCount / courseItems.length) * 100) : 0

            return (
              <section key={course.id} style={{ border: "1px solid #E5E7EB", borderRadius: "12px", background: "#fff", overflow: "hidden" }}>
                <div style={{ padding: "16px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: "22px" }}>{course.title}</h2>
                    <Link href={`/learn/${course.id}`} style={{ color: "#1D4ED8", textDecoration: "none", fontWeight: 600 }}>
                      Open Course
                    </Link>
                  </div>
                  {course.description && <p style={{ color: "#6B7280", marginBottom: "12px" }}>{course.description}</p>}
                  <div style={{ background: "#E5E7EB", borderRadius: "999px", height: "10px", overflow: "hidden" }}>
                    <div style={{ width: `${completionPercent}%`, background: "#10B981", height: "100%" }} />
                  </div>
                  <p style={{ marginTop: "8px", fontSize: "14px", color: "#374151" }}>{completionPercent}% proficient</p>
                </div>

                <div style={{ padding: "14px 16px", display: "grid", gap: "10px" }}>
                  {courseItems.length === 0 && <p style={{ margin: 0, color: "#6B7280" }}>No syllabus items yet.</p>}
                  {courseItems.map((item) => {
                    const itemProgress = progressLookup[item.id]
                    const status = itemProgress?.status || "not_started"
                    return (
                      <div key={item.id} style={{ border: "1px solid #F3F4F6", borderRadius: "10px", padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <p style={{ margin: 0, fontWeight: 600 }}>
                            {item.order_index}. {item.title}
                          </p>
                          <span
                            style={{
                              background: "#F9FAFB",
                              border: `1px solid ${STATUS_COLORS[status]}`,
                              color: STATUS_COLORS[status],
                              borderRadius: "999px",
                              fontSize: "12px",
                              padding: "4px 10px",
                              fontWeight: 700,
                            }}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                        </div>
                        {itemProgress?.score && (
                          <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#4B5563" }}>
                            Score: {itemProgress.score}/5
                          </p>
                        )}
                        {itemProgress?.instructor_notes && (
                          <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#4B5563", whiteSpace: "pre-wrap" }}>
                            {itemProgress.instructor_notes}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <section style={{ marginTop: "24px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "16px" }}>
        <h2 style={{ marginTop: 0 }}>Recent Lesson Debriefs</h2>
        {evaluations.length === 0 ? (
          <p style={{ color: "#6B7280" }}>No debriefs yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {evaluations.map((entry) => {
              const negativeObservations =
                extractLabeledSection(entry.improvements, "Negative Observations") ||
                extractLabeledSection(entry.improvements, "Unsatisfactory") ||
                entry.improvements
              const referenceMaterials =
                extractLabeledSection(entry.improvements, "References") ||
                extractLabeledSection(entry.improvements, "Deteriorating")
              const otherFeedback = extractLabeledSection(entry.improvements, "Other Feedback")
              const briefingNotes = extractLabeledSection(entry.next_lesson_focus, "Briefing Notes")
              const extractedSkills =
                extractLabeledSection(entry.next_lesson_focus, "Knowledge and Skills Needing Work") ||
                extractLabeledSection(entry.next_lesson_focus, "Practice to Proficiency")
              const skillsNeedingWork = extractedSkills || (!briefingNotes ? entry.next_lesson_focus : null)

              return (
                <article key={entry.id} style={{ border: "1px solid #F3F4F6", borderRadius: "10px", padding: "12px" }}>
                  <p style={{ marginTop: 0, marginBottom: "8px", fontSize: "13px", color: "#6B7280" }}>
                    {new Date(entry.created_at).toLocaleString()} • {getGradeLabel(entry.performance_rating).arrows} {getGradeLabel(entry.performance_rating).label}
                    {entry.lesson_id && lessonLookup[entry.lesson_id] ? ` • ${lessonLookup[entry.lesson_id]}` : ""}
                  </p>
                  {briefingNotes && <p style={{ margin: "0 0 6px 0", whiteSpace: "pre-wrap" }}><strong>Briefing Notes:</strong> {briefingNotes}</p>}
                  {entry.strengths && <p style={{ margin: "0 0 6px 0", whiteSpace: "pre-wrap" }}><strong>Positive Performance Observations:</strong> {entry.strengths}</p>}
                  {negativeObservations && <p style={{ margin: "0 0 6px 0", whiteSpace: "pre-wrap" }}><strong>Negative Performance Observations:</strong> {negativeObservations}</p>}
                  {referenceMaterials && <p style={{ margin: "0 0 6px 0", whiteSpace: "pre-wrap" }}><strong>Reference Materials and Standards:</strong> {referenceMaterials}</p>}
                  {skillsNeedingWork && <p style={{ margin: "0 0 6px 0", whiteSpace: "pre-wrap" }}><strong>Knowledge and Skills Needing Work:</strong> {skillsNeedingWork}</p>}
                  {entry.homework && <p style={{ margin: "0 0 6px 0", whiteSpace: "pre-wrap" }}><strong>Recommended Study and Practice:</strong> {entry.homework}</p>}
                  {otherFeedback && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}><strong>Additional Feedback:</strong> {otherFeedback}</p>}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </LearningHubLayout>
  )
}
