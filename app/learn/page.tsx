"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import LearningHubLayout from "@/app/components/LearningHubLayout"

interface Course {
  id: string
  title: string
  description: string | null
  is_published: boolean
  enrollment?: { id: string }
}

interface SyllabusLesson {
  id: string
  lesson_number: number
  title: string
  description: string | null
  stage: string | null
  ground_topics: string[]
  flight_maneuvers: string[]
  completion_standards: string | null
}

const timelineExpectations = [
  {
    phase: "Phase 1",
    title: "Discovery + Enrollment",
    focus: "Discovery flight, training goals, onboarding setup",
  },
  {
    phase: "Phase 2",
    title: "Foundations + Pre-Solo",
    focus: "Aircraft control, pattern work, emergency procedures, solo prep",
  },
  {
    phase: "Phase 3",
    title: "Cross-Country + Solo Building",
    focus: "Navigation, weather decisions, long cross-country requirements",
  },
  {
    phase: "Phase 4",
    title: "Knowledge Test + Checkride Prep",
    focus: "FAA written exam, ACS standards, mock oral and practical",
  },
  {
    phase: "Phase 5",
    title: "Practical Test + Certificate",
    focus: "Final checkride and private pilot certificate issuance",
  },
]

export default function LearnPage() {
  const { user, isAdmin } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [watchedLessons, setWatchedLessons] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)
  const [nextLesson, setNextLesson] = useState<SyllabusLesson | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const [enrollmentResult, progressResult] = await Promise.all([
          supabase
            .from("enrollments")
            .select("course_id, courses!inner(id, title, description, is_published)")
            .eq("student_id", user.id),
          supabase
            .from("progress")
            .select("percent_watched")
            .eq("student_id", user.id),
        ])

        if (enrollmentResult.error) throw enrollmentResult.error

        const enrolledCourses = enrollmentResult.data?.map((e: any) => ({
          ...e.courses,
          enrollment: { id: e.course_id }
        })) || []

        setCourses(enrolledCourses)

        const progressRecords = progressResult.data || []
        const watched = progressRecords.filter((entry: { percent_watched: number | null }) => (entry.percent_watched || 0) > 0).length
        const completed = progressRecords.filter((entry: { percent_watched: number | null }) => (entry.percent_watched || 0) >= 90).length
        setWatchedLessons(watched)
        setCompletedLessons(completed)

        const courseIds = enrolledCourses.map((c: Course) => c.id)
        if (courseIds.length > 0) {
          const [lessonsResult, completionsResult] = await Promise.all([
            supabase
              .from("syllabus_lessons")
              .select("id, lesson_number, title, description, stage, ground_topics, flight_maneuvers, completion_standards")
              .in("course_id", courseIds)
              .order("order_index", { ascending: true }),
            supabase
              .from("student_lesson_completions")
              .select("syllabus_lesson_id")
              .eq("student_id", user.id),
          ])

          const completedIds = new Set((completionsResult.data || []).map((c: any) => c.syllabus_lesson_id))
          const allLessons = lessonsResult.data || []
          const next = allLessons.find((l: any) => !completedIds.has(l.id))
          if (next) setNextLesson(next)
        }
      } catch (error) {
        console.error("Error loading courses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user])

  const completionRate = watchedLessons > 0 ? Math.round((completedLessons / watchedLessons) * 100) : 0

  return (
    <LearningHubLayout
      title="Learn Flight Training"
      subtitle="Build knowledge, track your coursework, and stay checkride-ready with your assigned lessons."
      activeTab="learn"
      headerVariant="schedule"
      stats={[
        { label: "Assigned Courses", value: String(courses.length) },
        { label: "Lessons Started", value: String(watchedLessons) },
        { label: "Completion Rate", value: `${completionRate}%` },
      ]}
    >

      {isAdmin && (
        <div style={{ marginBottom: "30px" }}>
          <Link
            href="/admin/courses"
            style={{
              display: "inline-block",
              backgroundColor: "#C59A2A",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            Manage Courses (Admin)
          </Link>
        </div>
      )}

      {user && (
        <div style={{ marginBottom: "24px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/private-pilot-timeline"
            style={{
              display: "inline-block",
              border: "1px solid #C59A2A",
              color: "#C59A2A",
              padding: "10px 16px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            View Private Pilot Timeline
          </Link>
          <Link
            href="/onboarding"
            style={{
              display: "inline-block",
              border: "1px solid #111827",
              color: "#111827",
              padding: "10px 16px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            Open Onboarding Tracker
          </Link>
        </div>
      )}

      {nextLesson && (
        <div style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          border: "1px solid #334155",
          borderRadius: "12px",
          padding: "24px",
          color: "#fff",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ flex: 1, minWidth: "240px" }}>
              <p style={{
                margin: "0 0 8px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#C59A2A",
              }}>
                ✈ Up Next — Lesson {nextLesson.lesson_number}
              </p>
              <h3 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800 }}>
                {nextLesson.title}
              </h3>
              {nextLesson.description && (
                <p style={{ margin: "0 0 16px", color: "#94A3B8", fontSize: "14px", lineHeight: "1.5" }}>
                  {nextLesson.description}
                </p>
              )}

              {nextLesson.ground_topics.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Ground Topics
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {nextLesson.ground_topics.map((topic, i) => (
                      <span key={i} style={{
                        display: "inline-block", padding: "4px 10px", borderRadius: "6px",
                        fontSize: "12px", fontWeight: 600, backgroundColor: "rgba(197,154,42,0.15)",
                        color: "#C59A2A", border: "1px solid rgba(197,154,42,0.3)",
                      }}>{topic}</span>
                    ))}
                  </div>
                </div>
              )}

              {nextLesson.flight_maneuvers.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Flight Maneuvers
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {nextLesson.flight_maneuvers.map((maneuver, i) => (
                      <span key={i} style={{
                        display: "inline-block", padding: "4px 10px", borderRadius: "6px",
                        fontSize: "12px", fontWeight: 600, backgroundColor: "rgba(59,130,246,0.15)",
                        color: "#60A5FA", border: "1px solid rgba(59,130,246,0.3)",
                      }}>{maneuver}</span>
                    ))}
                  </div>
                </div>
              )}

              {nextLesson.completion_standards && (
                <p style={{ marginTop: "14px", marginBottom: 0, fontSize: "13px", color: "#64748B", fontStyle: "italic", lineHeight: "1.5" }}>
                  Standards: {nextLesson.completion_standards}
                </p>
              )}
            </div>

            <Link
              href="/documents"
              style={{
                display: "inline-block",
                backgroundColor: "#C59A2A",
                color: "#fff",
                padding: "10px 18px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              View Full Syllabus →
            </Link>
          </div>
        </div>
      )}

      {!user ? (
        <div style={{ display: "grid", gap: "16px" }}>
          <div
            style={{
              backgroundColor: "#FEF3C7",
              border: "1px solid #FCD34D",
              borderRadius: "8px",
              padding: "20px",
              color: "#92400E",
            }}
          >
            <p style={{ margin: 0 }}>
              Sign in to see courses and progress. {" "}
              <Link href="/login" style={{ color: "#1E40AF", textDecoration: "underline" }}>
                Sign in here
              </Link>
              {" "}to track your training in real time.
            </p>
          </div>

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "8px" }}>What to Expect in Private Pilot Training</h3>
            <p style={{ marginTop: 0, marginBottom: "16px", color: "#6B7280" }}>
              Here is the full timeline so you can preview the journey before signing in.
            </p>
            <div style={{ display: "grid", gap: "12px" }}>
              {timelineExpectations.map((item) => (
                <div
                  key={item.phase}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    backgroundColor: "#F9FAFB",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#C59A2A", textTransform: "uppercase" }}>
                    {item.phase}
                  </p>
                  <p style={{ margin: "3px 0 0 0", fontWeight: 700, color: "#111827" }}>{item.title}</p>
                  <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#4B5563" }}>{item.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
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
          <p>No courses assigned yet. Contact your instructor.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/learn/${course.id}`}
              style={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "20px",
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)"
                e.currentTarget.style.transform = "translateY(-2px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <h3 style={{ marginBottom: "10px", marginTop: 0 }}>{course.title}</h3>
              {course.description && (
                <p style={{ color: "#6B7280", marginBottom: "10px", fontSize: "14px" }}>
                  {course.description}
                </p>
              )}
              <div style={{ color: "#C59A2A", fontWeight: "600", fontSize: "14px" }}>
                View Course →
              </div>
            </Link>
          ))}
        </div>
      )}
    </LearningHubLayout>
  )
}
