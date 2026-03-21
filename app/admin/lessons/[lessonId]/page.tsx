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

interface LessonDocument {
  id: string
  title: string
  file_bucket: string
  file_path: string
  mime_type: string | null
}

const VIDEO_STORAGE_BUCKETS = ["lesson-videos", "videos"] as const
const DOCUMENT_STORAGE_BUCKETS = ["lesson-documents"] as const

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
  const [isVideoDragActive, setIsVideoDragActive] = useState(false)
  const [documents, setDocuments] = useState<LessonDocument[]>([])
  const [newDocumentTitle, setNewDocumentTitle] = useState("")
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null)
  const [isDocumentDragActive, setIsDocumentDragActive] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
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

        const { data: docsData, error: docsError } = await supabase
          .from("lesson_documents")
          .select("id, title, file_bucket, file_path, mime_type")
          .eq("lesson_id", lessonId)
          .order("created_at", { ascending: false })

        if (docsError) throw docsError
        setDocuments(docsData || [])
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

  const handleDocumentDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDocumentDragActive(false)
    const file = e.dataTransfer.files?.[0] || null
    if (file) {
      setSelectedDocumentFile(file)
      if (!newDocumentTitle.trim()) {
        setNewDocumentTitle(file.name.replace(/\.[^.]+$/, ""))
      }
    }
  }

  const handleVideoDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsVideoDragActive(false)
    const file = e.dataTransfer.files?.[0] || null
    if (file) {
      setSelectedFile(file)
      if (!newVideoTitle.trim()) {
        setNewVideoTitle(file.name.replace(/\.[^.]+$/, ""))
      }
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

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDocumentTitle.trim() || !selectedDocumentFile) {
      alert("Please fill in title and select a document")
      return
    }

    setUploadingDocument(true)

    try {
      const timestamp = Date.now()
      const fileName = `${timestamp}-${selectedDocumentFile.name.replace(/\s+/g, "-")}`
      const storagePath = `courses/lesson-${lessonId}/documents/${fileName}`

      let uploadSucceeded = false
      let uploadErrorMessage = ""

      for (const bucket of DOCUMENT_STORAGE_BUCKETS) {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, selectedDocumentFile, { upsert: false, cacheControl: "3600" })

        if (!uploadError) {
          uploadSucceeded = true
          break
        }

        uploadErrorMessage = uploadError.message
      }

      if (!uploadSucceeded) {
        throw new Error(uploadErrorMessage || "Document upload failed")
      }

      const { data, error: insertError } = await supabase
        .from("lesson_documents")
        .insert([
          {
            lesson_id: lessonId,
            title: newDocumentTitle.trim(),
            file_bucket: "lesson-documents",
            file_path: storagePath,
            mime_type: selectedDocumentFile.type || null,
          },
        ])
        .select("id, title, file_bucket, file_path, mime_type")

      if (insertError) throw insertError

      if (data?.[0]) {
        setDocuments([data[0], ...documents])
      }

      setSelectedDocumentFile(null)
      setNewDocumentTitle("")
    } catch (error) {
      console.error("Error uploading document:", error)
      const message = error instanceof Error ? error.message : "Failed to upload document"
      alert(`Failed to upload document: ${message}`)
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleDeleteDocument = async (documentId: string, bucket: string, filePath: string) => {
    if (!confirm("Delete this course document?")) return

    try {
      const { error: deleteStorageError } = await supabase.storage.from(bucket).remove([filePath])
      if (deleteStorageError) throw deleteStorageError

      const { error: deleteDbError } = await supabase.from("lesson_documents").delete().eq("id", documentId)
      if (deleteDbError) throw deleteDbError

      setDocuments(documents.filter((doc) => doc.id !== documentId))
    } catch (error) {
      console.error("Error deleting document:", error)
      const message = error instanceof Error ? error.message : "Failed to delete document"
      alert(`Failed to delete document: ${message}`)
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
                <div
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "8px",
                    border: isVideoDragActive ? "2px dashed #C59A2A" : "1px dashed #D1D5DB",
                    fontSize: "16px",
                    backgroundColor: isVideoDragActive ? "#FEF3C7" : "#FFFFFF",
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsVideoDragActive(true)
                  }}
                  onDragLeave={() => setIsVideoDragActive(false)}
                  onDrop={handleVideoDrop}
                >
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    required
                    style={{ width: "100%" }}
                  />
                  <p style={{ fontSize: "12px", marginTop: "8px", marginBottom: 0, color: "#4B5563" }}>
                    Drag and drop a video here, or click to choose a file.
                  </p>
                  {selectedFile && (
                    <p style={{ fontSize: "12px", marginTop: "8px", marginBottom: 0, color: "#111827", fontWeight: 600 }}>
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
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

          <div
            style={{
              backgroundColor: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "30px",
              marginBottom: "40px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Upload Course Document</h2>
            <form onSubmit={handleUploadDocument} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  value={newDocumentTitle}
                  onChange={(e) => setNewDocumentTitle(e.target.value)}
                  placeholder="e.g., Preflight Checklist PDF"
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
                  Document File *
                </label>
                <div
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "8px",
                    border: isDocumentDragActive ? "2px dashed #C59A2A" : "1px dashed #D1D5DB",
                    fontSize: "16px",
                    backgroundColor: isDocumentDragActive ? "#FEF3C7" : "#FFFFFF",
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDocumentDragActive(true)
                  }}
                  onDragLeave={() => setIsDocumentDragActive(false)}
                  onDrop={handleDocumentDrop}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,image/*"
                    onChange={(e) => setSelectedDocumentFile(e.target.files?.[0] || null)}
                    required
                    style={{ width: "100%" }}
                  />
                  <p style={{ fontSize: "12px", marginTop: "8px", marginBottom: 0, color: "#4B5563" }}>
                    Drag and drop a course document here, or click to choose a file.
                  </p>
                  {selectedDocumentFile && (
                    <p style={{ fontSize: "12px", marginTop: "8px", marginBottom: 0, color: "#111827", fontWeight: 600 }}>
                      Selected: {selectedDocumentFile.name}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={uploadingDocument}
                style={{
                  backgroundColor: "#374151",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: uploadingDocument ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  opacity: uploadingDocument ? 0.6 : 1,
                  width: "fit-content",
                }}
              >
                {uploadingDocument ? "Uploading..." : "Upload Document"}
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

          <div style={{ marginTop: "40px" }}>
            <h2>Course Documents ({documents.length})</h2>
            {documents.length === 0 ? (
              <div
                style={{
                  backgroundColor: "#F3F4F6",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  padding: "30px 20px",
                  textAlign: "center",
                  color: "#6B7280",
                }}
              >
                <p>No course documents uploaded yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {documents.map((document) => (
                  <div
                    key={document.id}
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>{document.title}</h3>
                      <p style={{ fontSize: "12px", color: "#6B7280", margin: "4px 0 0 0" }}>
                        {document.mime_type || "Document"} - {document.file_path}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(document.id, document.file_bucket, document.file_path)}
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
