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

export default function LearnPage() {
  const { user, isAdmin } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [watchedLessons, setWatchedLessons] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)
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

      {!user ? (
        <div
          style={{
            backgroundColor: "#FEF3C7",
            border: "1px solid #FCD34D",
            borderRadius: "8px",
            padding: "20px",
            color: "#92400E",
          }}
        >
          <p>
            Sign in to access your courses.{" "}
            <Link href="/login" style={{ color: "#1E40AF", textDecoration: "underline" }}>
              Sign in here
            </Link>
          </p>
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
