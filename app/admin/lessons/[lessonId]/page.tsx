"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"

interface Video {
  id: string
  title: string
  storage_path: string
  duration_seconds: number | null
}

interface Lesson {
  id: string
  title: string
  unit_id: string
}

export default function ManageVideosPage() {
  const params = useParams()
  const lessonId = params.lessonId as string
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [uploading, setUploading] = useState(false)
  const [newVideoTitle, setNewVideoTitle] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAdmin) {
      setLoading(false)
      router.push("/login")
      return
    }

    const fetchLesson = async () => {
      try {
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("id, title, unit_id")
          .eq("id", lessonId)
          .single()

        if (lessonError) throw lessonError
        setLesson(lessonData)

        const { data: videosData, error: videosError } = await supabase
          .from("videos")
          .select("id, title, storage_path, duration_seconds")
          .eq("lesson_id", lessonId)

        if (videosError) throw videosError
        setVideos(videosData || [])
      } catch (error) {
        console.error("Error loading lesson:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()
  }, [authLoading, lessonId, isAdmin, router])

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVideoTitle.trim() || !selectedFile) {
      alert("Please fill in title and select a file")
      return
    }

    setUploading(true)

    try {
      // Generate unique path
      const timestamp = Date.now()
      const fileName = `${timestamp}-${selectedFile.name.replace(/\s+/g, "-")}`
      const storagePath = `courses/lesson-${lessonId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(storagePath, selectedFile)

      if (uploadError) throw uploadError

      // Calculate duration (you might want to do this server-side with ffmpeg)
      const video = new Blob([selectedFile])
      const url = URL.createObjectURL(video)
      const videoElement = document.createElement("video")
      videoElement.src = url

      let duration: number | null = null
      videoElement.onloadedmetadata = () => {
        duration = Math.round(videoElement.duration)
      }

      // Store video metadata in database
      const { data, error: insertError } = await supabase
        .from("videos")
        .insert([
          {
            lesson_id: lessonId,
            title: newVideoTitle,
            storage_path: storagePath,
            duration_seconds: duration || null,
          },
        ])
        .select()

      if (insertError) throw insertError

      if (data) {
        setVideos([...videos, data[0]])
        setNewVideoTitle("")
        setSelectedFile(null)
      }
    } catch (error) {
      console.error("Error uploading video:", error)
      alert("Failed to upload video")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteVideo = async (videoId: string, storagePath: string) => {
    if (!confirm("Delete this video?")) return

    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("videos")
        .remove([storagePath])

      if (deleteError) throw deleteError

      // Delete from database
      const { error: dbError } = await supabase.from("videos").delete().eq("id", videoId)

      if (dbError) throw dbError

      setVideos(videos.filter((v) => v.id !== videoId))
    } catch (error) {
      console.error("Error deleting video:", error)
      alert("Failed to delete video")
    }
  }

  if (loading)
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Loading lesson...</p>
      </div>
    )

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
      <Link
        href="/admin/courses"
        style={{
          color: "#6B7280",
          textDecoration: "none",
          marginBottom: "20px",
          display: "inline-block",
        }}
      >
        ← Back to Courses
      </Link>

      {lesson && (
        <>
          <h1 style={{ marginBottom: "10px" }}>{lesson.title}</h1>
          <p style={{ color: "#6B7280", marginBottom: "40px" }}>Manage videos for this lesson</p>

          {/* Video Upload Form */}
          <div
            style={{
              backgroundColor: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "30px",
              marginBottom: "40px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Upload Video</h2>
            <form onSubmit={handleUploadVideo} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                  Video Title *
                </label>
                <input
                  type="text"
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  placeholder="e.g., Lesson 1 Introduction"
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    fontSize: "16px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                  Video File (MP4) *
                </label>
                <input
                  type="file"
                  accept="video/mp4"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    fontSize: "16px",
                  }}
                />
                <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "5px" }}>
                  Large video files may take a few minutes to upload. Please be patient.
                </p>
              </div>

              <button
                type="submit"
                disabled={uploading}
                style={{
                  backgroundColor: "#C59A2A",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  opacity: uploading ? 0.6 : 1,
                  width: "fit-content",
                }}
              >
                {uploading ? "Uploading..." : "Upload Video"}
              </button>
            </form>
          </div>

          {/* Videos List */}
          <div>
            <h2>Videos ({videos.length})</h2>
            {videos.length === 0 ? (
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
                <p>No videos uploaded yet. Upload one above.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {videos.map((video) => (
                  <div
                    key={video.id}
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      padding: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <h3 style={{ marginTop: 0, marginBottom: "5px" }}>{video.title}</h3>
                      {video.duration_seconds && (
                        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
                          Duration: {Math.round(video.duration_seconds / 60)} minutes
                        </p>
                      )}
                      <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "5px 0 0 0" }}>
                        {video.storage_path}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteVideo(video.id, video.storage_path)}
                      style={{
                        backgroundColor: "#EF4444",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
