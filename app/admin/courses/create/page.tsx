"use client"

import { useState } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CreateCoursePage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (authLoading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Checking admin access...</p>
      </div>
    )
  }

  if (!isAdmin) {
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
          <p>Only admins can create courses.</p>
          <Link href="/login" style={{ color: "#1E40AF", textDecoration: "underline" }}>
            Sign in as admin
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!user) {
      setError("You must be logged in")
      setLoading(false)
      return
    }

    try {
      const { data, error: createError } = await supabase
        .from("courses")
        .insert([
          {
            title,
            description,
            created_by: user.id,
            is_published: false,
          },
        ])
        .select()

      if (createError) throw createError

      if (data && data[0]) {
        router.push(`/admin/courses/${data[0].id}/edit`)
      }
    } catch (err) {
      console.error("Error creating course:", err)
      setError("Failed to create course. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ marginBottom: "30px" }}>Create New Course</h1>

      {error && (
        <div
          style={{
            backgroundColor: "#FEE2E2",
            border: "1px solid #FECACA",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#991B1B",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
            Course Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Private Pilot License"
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
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the course..."
            rows={5}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #D1D5DB",
              fontSize: "16px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: "#C59A2A",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "600",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Creating..." : "Create Course"}
          </button>
          <Link
            href="/admin/courses"
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "1px solid #D1D5DB",
              textDecoration: "none",
              color: "#374151",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
