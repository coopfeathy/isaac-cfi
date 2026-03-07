"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Unit {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  order_index: number
  videos: Video[]
  progress?: ProgressRecord
}

interface Video {
  id: string
  title: string
  storage_path: string
  duration_seconds: number | null
}

interface ProgressRecord {
  percent_watched: number
}

interface Course {
  id: string
  title: string
  description: string | null
}

export default function CoursePage() {
  const params = useParams()
  const courseId = params.courseId as string
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourse = async () => {
      if (!user) {
        setError("Please sign in to view this course")
        setLoading(false)
        return
      }

      try {
        // Verify enrollment
        const { data: enrollment, error: enrollError } = await supabase
          .from("enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("student_id", user.id)
          .single()

        if (enrollError && enrollError.code !== "PGRST116") throw enrollError
        if (!enrollment) {
          setError("You are not enrolled in this course")
          setLoading(false)
          return
        }

        // Get course
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, title, description")
          .eq("id", courseId)
          .single()

        if (courseError) throw courseError
        setCourse(courseData)

        // Get units and lessons with videos
        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select(
            `
            id,
            title,
            order_index,
            lessons (
              id,
              title,
              order_index,
              videos (
                id,
                title,
                storage_path,
                duration_seconds
              )
            )
          `
          )
          .eq("course_id", courseId)
          .order("order_index", { ascending: true })

        if (unitsError) throw unitsError

        // Get progress for all lessons
        const { data: progressData, error: progressError } = await supabase
          .from("progress")
          .select("lesson_id, percent_watched")
          .eq("student_id", user.id)

        if (progressError && progressError.code !== "PGRST116") throw progressError

        const progressMap: Record<string, number> = {}
        progressData?.forEach((p: any) => {
          progressMap[p.lesson_id] = p.percent_watched
        })

        // Attach progress to lessons
        const unitsWithProgress = unitsData.map((unit: any) => ({
          ...unit,
          lessons: unit.lessons.map((lesson: any) => ({
            ...lesson,
            progress: { percent_watched: progressMap[lesson.id] || 0 }
          })).sort((a: any, b: any) => a.order_index - b.order_index)
        }))

        setUnits(unitsWithProgress)
      } catch (err) {
        console.error("Error loading course:", err)
        setError("Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [user, courseId])

  if (loading)
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Loading course...</p>
      </div>
    )

  if (error)
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <div
          style={{
            backgroundColor: "#FEE2E2",
            border: "1px solid #FECACA",
            borderRadius: "8px",
            padding: "20px",
            color: "#991B1B",
          }}
        >
          <p>{error}</p>
          <Link href="/learn" style={{ color: "#1E40AF", textDecoration: "underline" }}>
            Back to courses
          </Link>
        </div>
      </div>
    )

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
      <Link
        href="/learn"
        style={{
          color: "#6B7280",
          textDecoration: "none",
          marginBottom: "20px",
          display: "inline-block",
        }}
      >
        ← Back to Courses
      </Link>

      {course && (
        <>
          <h1 style={{ marginBottom: "10px" }}>{course.title}</h1>
          {course.description && (
            <p style={{ color: "#6B7280", marginBottom: "40px", maxWidth: "600px" }}>
              {course.description}
            </p>
          )}
        </>
      )}

      <div>
        {units.map((unit) => (
          <div key={unit.id} style={{ marginBottom: "40px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                marginBottom: "20px",
                paddingBottom: "10px",
                borderBottom: "2px solid #E5E7EB",
              }}
            >
              {unit.title}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {unit.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/${courseId}/${lesson.id}`}
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
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"
                    e.currentTarget.style.borderColor = "#C59A2A"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none"
                    e.currentTarget.style.borderColor = "#E5E7EB"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ marginBottom: "8px", marginTop: 0 }}>{lesson.title}</h3>
                      {lesson.videos.length > 0 && (
                        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
                          {lesson.videos.length} video{lesson.videos.length !== 1 ? "s" : ""}
                          {lesson.videos[0]?.duration_seconds && (
                            <> • {Math.round(lesson.videos[0].duration_seconds / 60)} min</>
                          )}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        backgroundColor: "#F3F4F6",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        minWidth: "100px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "700",
                          color: lesson.progress && lesson.progress.percent_watched >= 90
                            ? "#10B981"
                            : "#6B7280",
                        }}
                      >
                        {lesson.progress?.percent_watched || 0}%
                      </div>
                      <div style={{ fontSize: "12px", color: "#6B7280" }}>watched</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {units.length === 0 && (
        <div
          style={{
            backgroundColor: "#F3F4F6",
            border: "1px solid #D1D5DB",
            borderRadius: "8px",
            padding: "40px 20px",
            textAlign: "center",
            color: "#6B7280",
          }}
        >
          <p>No lessons in this course yet.</p>
        </div>
      )}
    </div>
  )
}
