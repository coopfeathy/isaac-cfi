"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import LearningHubLayout from "@/app/components/LearningHubLayout"

interface SyllabusLesson {
  id: string
  course_id: string
  order_index: number
  title: string
  description: string | null
  stage: string
  ground_topics: string[]
  flight_maneuvers: string[]
  completion_standards: string | null
}

interface LessonCompletion {
  syllabus_lesson_id: string
  completed_at: string
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  "pre-solo": { label: "Pre-Solo", color: "#3B82F6" },
  "cross-country": { label: "Cross-Country", color: "#D97706" },
  "checkride-prep": { label: "Checkride Prep", color: "#059669" },
}

export default function DocumentsPage() {
  const { user } = useAuth()
  const [lessons, setLessons] = useState<SyllabusLesson[]>([])
  const [completions, setCompletions] = useState<LessonCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [hasEnrollments, setHasEnrollments] = useState(true)

  useEffect(() => {
    const fetchSyllabus = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data: enrollments, error: enrollError } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("student_id", user.id)

        if (enrollError) throw enrollError

        if (!enrollments || enrollments.length === 0) {
          setHasEnrollments(false)
          setLoading(false)
          return
        }

        const courseIds = enrollments.map((e) => e.course_id)

        const [lessonsResult, completionsResult] = await Promise.all([
          supabase
            .from("syllabus_lessons")
            .select("*")
            .in("course_id", courseIds)
            .order("order_index", { ascending: true }),
          supabase
            .from("student_lesson_completions")
            .select("syllabus_lesson_id, completed_at")
            .eq("student_id", user.id),
        ])

        if (lessonsResult.error) throw lessonsResult.error

        setLessons(lessonsResult.data || [])
        setCompletions(completionsResult.data || [])
      } catch (error) {
        console.error("Error loading syllabus:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSyllabus()
  }, [user])

  const completionMap = new Map(
    completions.map((c) => [c.syllabus_lesson_id, c.completed_at])
  )

  const completedCount = completions.length
  const totalCount = lessons.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const groupedByStage = lessons.reduce<Record<string, SyllabusLesson[]>>((acc, lesson) => {
    const stage = lesson.stage || "other"
    if (!acc[stage]) acc[stage] = []
    acc[stage].push(lesson)
    return acc
  }, {})

  const stageOrder = ["pre-solo", "cross-country", "checkride-prep"]
  const orderedStages = stageOrder.filter((s) => groupedByStage[s])

  return (
    <LearningHubLayout
      title="Training Documents"
      subtitle="Your Private Pilot syllabus — lesson-by-lesson training plan from first flight to checkride."
      activeTab="documents"
      headerVariant="schedule"
      stats={[
        { label: "Total Lessons", value: String(totalCount) },
        { label: "Completed", value: String(completedCount) },
        { label: "Progress", value: `${progressPercent}%` },
      ]}
    >
      {!user ? (
        <p style={{ color: "#6B7280" }}>Sign in to view your syllabus.</p>
      ) : loading ? (
        <p>Loading syllabus...</p>
      ) : !hasEnrollments ? (
        <div
          style={{
            backgroundColor: "#F3F4F6",
            border: "1px solid #D1D5DB",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            color: "#6B7280",
          }}
        >
          <p style={{ margin: 0 }}>No courses assigned yet. Contact your instructor.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "32px" }}>
          {orderedStages.map((stage) => {
            const config = STAGE_CONFIG[stage] || { label: stage, color: "#6B7280" }
            const stageLessons = groupedByStage[stage]

            return (
              <div key={stage}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ width: "4px", height: "28px", backgroundColor: config.color, borderRadius: "2px" }} />
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>{config.label}</h2>
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>
                    {stageLessons.length} lesson{stageLessons.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                  {stageLessons.map((lesson, idx) => {
                    const completedAt = completionMap.get(lesson.id)
                    const isCompleted = !!completedAt

                    return (
                      <div
                        key={lesson.id}
                        style={{
                          backgroundColor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "12px",
                          padding: "20px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: config.color,
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "14px",
                              flexShrink: 0,
                            }}
                          >
                            {lesson.order_index}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                              {lesson.title}
                            </h3>
                            {lesson.description && (
                              <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#6B7280", lineHeight: 1.5 }}>
                                {lesson.description}
                              </p>
                            )}

                            {lesson.ground_topics && lesson.ground_topics.length > 0 && (
                              <div style={{ marginBottom: "10px" }}>
                                <p style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Ground Topics
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {lesson.ground_topics.map((topic, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        backgroundColor: "#F3F4F6",
                                        border: "1px solid #E5E7EB",
                                        borderRadius: "6px",
                                        padding: "3px 8px",
                                        fontSize: "12px",
                                        color: "#374151",
                                      }}
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {lesson.flight_maneuvers && lesson.flight_maneuvers.length > 0 && (
                              <div style={{ marginBottom: "10px" }}>
                                <p style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Flight Maneuvers
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {lesson.flight_maneuvers.map((maneuver, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        backgroundColor: "#EEF2FF",
                                        border: "1px solid #C7D2FE",
                                        borderRadius: "6px",
                                        padding: "3px 8px",
                                        fontSize: "12px",
                                        color: "#4338CA",
                                      }}
                                    >
                                      {maneuver}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {lesson.completion_standards && (
                              <p style={{ margin: "8px 0 0 0", fontSize: "13px", fontStyle: "italic", color: "#9CA3AF", lineHeight: 1.5 }}>
                                {lesson.completion_standards}
                              </p>
                            )}

                            <div style={{ marginTop: "12px", fontSize: "13px" }}>
                              {isCompleted ? (
                                <span style={{ color: "#059669", fontWeight: 600 }}>
                                  ✓ Completed {new Date(completedAt).toLocaleDateString()}
                                </span>
                              ) : (
                                <span style={{ color: "#9CA3AF" }}>Not completed</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </LearningHubLayout>
  )
}
