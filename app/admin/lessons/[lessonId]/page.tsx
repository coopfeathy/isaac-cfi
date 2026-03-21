"use client"

import { useEffect, useState } from "react"
import AdminPageShell from "@/app/components/AdminPageShell"
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

const VIDEO_STORAGE_BUCKETS = ["lesson-videos", "videos"] as const

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

  const getVideoDuration = async (file: File): Promise<number | null> => {
    try {
      const objectUrl = URL.createObjectURL(file)
      const duration = await new Promise<number>((resolve, reject) => {
        const element = document.createElement("video")
        element.preload = "metadata"
        element.onloadedmetadata = () => {
          resolve(element.duration)
        }
        element.onerror = () => reject(new Error("Failed to read video metadata"))
        element.src = objectUrl
      })
      URL.revokeObjectURL(objectUrl)
      return Number.isFinite(duration) ? Math.round(duration) : null
    } catch {
      return null
    }
  }

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
      // Generate a unique storage path for this lesson
      const timestamp = Date.now()
      const fileName = `${timestamp}-${selectedFile.name.replace(/\s+/g, "-")}`
      const storagePath = `courses/lesson-${lessonId}/${fileName}`

      // Upload to configured bucket with fallback for older environments.
      let uploadSucceeded = false
      let uploadErrorMessage = ""
      for (const bucket of VIDEO_STORAGE_BUCKETS) {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, selectedFile, { upsert: false, cacheControl: "3600" })

        if (!uploadError) {
          uploadSucceeded = true
          break
        }

        uploadErrorMessage = uploadError.message
      }

      if (!uploadSucceeded) {
        throw new Error(uploadErrorMessage || "Video upload failed for all configured buckets")
      }

      const duration = await getVideoDuration(selectedFile)

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
      const message = error instanceof Error ? error.message : "Failed to upload video"
      alert(`Failed to upload video: ${message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteVideo = async (videoId: string, storagePath: string) => {
    if (!confirm("Delete this video?")) return

    try {
      // Delete from storage (try all supported buckets).
      let storageDeleted = false
      let lastStorageError: string | null = null
      for (const bucket of VIDEO_STORAGE_BUCKETS) {
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([storagePath])

        if (!deleteError) {
          storageDeleted = true
          break
        }

        lastStorageError = deleteError.message
      }

      if (!storageDeleted && lastStorageError) {
        throw new Error(lastStorageError)
      }

      // Delete from database
      const { error: dbError } = await supabase.from("videos").delete().eq("id", videoId)

      if (dbError) throw dbError

      setVideos(videos.filter((v) => v.id !== videoId))
    } catch (error) {
      console.error("Error deleting video:", error)
      const message = error instanceof Error ? error.message : "Failed to delete video"
      alert(`Failed to delete video: ${message}`)
    }
  }

  if (loading)
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Loading lesson...</p>
      </div>
    )

  return (
    <AdminPageShell
      title={lesson?.title || "Manage Lesson Videos"}
      description="Upload, review, and remove video content attached to this lesson."
      maxWidthClassName="max-w-5xl"
    >
      {lesson && (
        <>
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
                  accept="video/*"
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
    </AdminPageShell>
  )
}
