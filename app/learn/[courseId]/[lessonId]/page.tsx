"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Lesson {
  id: string
  title: string
  videos: Video[]
  unit_id: string
}

interface Video {
  id: string
  title: string
  storage_path: string
  duration_seconds: number | null
}

interface Unit {
  id: string
  title: string
}

const VIDEO_STORAGE_BUCKETS = ["lesson-videos", "videos"] as const

export default function LessonPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string
  const { user } = useAuth()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [unit, setUnit] = useState<Unit | null>(null)
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressUpdateRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchLesson = async () => {
      if (!user) {
        setError("Please sign in to view this lesson")
        setLoading(false)
        return
      }

      try {
        // Verify enrollment
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("student_id", user.id)
          .single()

        if (!enrollment) {
          setError("You are not enrolled in this course")
          setLoading(false)
          return
        }

        // Get lesson with videos
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select(
            `
            id,
            title,
            unit_id,
            videos (
              id,
              title,
              storage_path,
              duration_seconds
            )
          `
          )
          .eq("id", lessonId)
          .single()

        if (lessonError) throw lessonError
        setLesson(lessonData)

        if (lessonData.videos.length > 0) {
          setCurrentVideo(lessonData.videos[0])
        }

        // Get unit info
        const { data: unitData } = await supabase
          .from("units")
          .select("id, title")
          .eq("id", lessonData.unit_id)
          .single()

        if (unitData) setUnit(unitData)
      } catch (err) {
        console.error("Error loading lesson:", err)
        setError("Failed to load lesson")
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()
  }, [user, courseId, lessonId])

  const updateProgress = async (percentWatched: number) => {
    if (!user || !lesson) return

    try {
      const { error } = await supabase.from("progress").upsert(
        {
          lesson_id: lesson.id,
          student_id: user.id,
          percent_watched: Math.round(percentWatched),
          last_watched_at: new Date().toISOString(),
        },
        { onConflict: "lesson_id,student_id" }
      )

      if (error) throw error
    } catch (err) {
      console.error("Error updating progress:", err)
    }
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const percent = (video.currentTime / video.duration) * 100

    // Debounce progress updates
    if (progressUpdateRef.current) clearTimeout(progressUpdateRef.current)

    progressUpdateRef.current = setTimeout(() => {
      updateProgress(percent)
    }, 2000) // Update every 2 seconds
  }

  const handleVideoEnd = () => {
    updateProgress(100)
  }

  const getVideoSources = (storagePath: string) => {
    return VIDEO_STORAGE_BUCKETS.map((bucket) => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath)
      return data.publicUrl
    })
  }

  if (loading)
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Loading lesson...</p>
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
        href={`/learn/${courseId}`}
        style={{
          color: "#6B7280",
          textDecoration: "none",
          marginBottom: "20px",
          display: "inline-block",
        }}
      >
        ← Back to Course
      </Link>

      {lesson && (
        <div style={{ marginBottom: "40px" }}>
          <div style={{ marginBottom: "10px" }}>
            {unit && <p style={{ color: "#6B7280", margin: 0 }}>{unit.title}</p>}
          </div>
          <h1 style={{ marginBottom: "30px" }}>{lesson.title}</h1>

          {currentVideo ? (
            <div style={{ marginBottom: "40px" }}>
              <div
                style={{
                  backgroundColor: "#000",
                  borderRadius: "8px",
                  overflow: "hidden",
                  marginBottom: "20px",
                  maxWidth: "100%",
                }}
              >
                <video
                  ref={videoRef}
                  controls
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    backgroundColor: "#000",
                  }}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnd}
                >
                  {getVideoSources(currentVideo.storage_path).map((src) => (
                    <source key={src} src={src} type="video/mp4" />
                  ))}
                  Your browser does not support the video tag.
                </video>
              </div>

              <h2 style={{ marginTop: 0 }}>{currentVideo.title}</h2>
              {currentVideo.duration_seconds && (
                <p style={{ color: "#6B7280" }}>
                  Duration: {Math.round(currentVideo.duration_seconds / 60)} minutes
                </p>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#F3F4F6",
                border: "1px solid #D1D5DB",
                borderRadius: "8px",
                padding: "40px 20px",
                textAlign: "center",
                color: "#6B7280",
                marginBottom: "40px",
              }}
            >
              <p>No videos in this lesson yet.</p>
            </div>
          )}

          {lesson.videos.length > 1 && (
            <div>
              <h3>Videos in this lesson</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {lesson.videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setCurrentVideo(video)}
                    style={{
                      backgroundColor: currentVideo?.id === video.id ? "#C59A2A" : "#F3F4F6",
                      color: currentVideo?.id === video.id ? "white" : "inherit",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      fontSize: "14px",
                    }}
                    onMouseEnter={(e) => {
                      if (currentVideo?.id !== video.id) {
                        e.currentTarget.style.backgroundColor = "#E5E7EB"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentVideo?.id !== video.id) {
                        e.currentTarget.style.backgroundColor = "#F3F4F6"
                      }
                    }}
                  >
                    {video.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
