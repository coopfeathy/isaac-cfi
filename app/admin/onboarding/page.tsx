"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type QueueStatus = "account_created" | "profile_completed" | "id_uploaded" | "docs_signed" | "approved"

type QueueItem = {
  id: string
  user_id: string
  email: string | null
  legal_first_name: string | null
  legal_last_name: string | null
  phone: string | null
  certificate_goal: string | null
  status: QueueStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

type ReviewStatus = "approved" | "rejected" | "needs_changes"

export default function AdminOnboardingPage() {
  const router = useRouter()
  const { isAdmin, loading: authLoading, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<QueueItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (!isAdmin) {
      router.push("/")
      return
    }

    const loadQueue = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("onboarding_profiles")
          .select("id, user_id, email, legal_first_name, legal_last_name, phone, certificate_goal, status, admin_notes, created_at, updated_at")
          .order("updated_at", { ascending: false })

        if (error) throw error

        const queueData = (data || []) as QueueItem[]
        setItems(queueData)

        if (!selectedUserId && queueData.length > 0) {
          setSelectedUserId(queueData[0].user_id)
          setReviewNotes(queueData[0].admin_notes || "")
        }
      } catch (error) {
        console.error("Error loading onboarding queue:", error)
        setFeedback("Failed to load onboarding queue.")
      } finally {
        setLoading(false)
      }
    }

    loadQueue()
  }, [authLoading, isAdmin, router, user])

  const selectedItem = useMemo(() => {
    return items.find((item) => item.user_id === selectedUserId) || null
  }, [items, selectedUserId])

  const refreshQueue = async (focusUserId?: string) => {
    const { data, error } = await supabase
      .from("onboarding_profiles")
      .select("id, user_id, email, legal_first_name, legal_last_name, phone, certificate_goal, status, admin_notes, created_at, updated_at")
      .order("updated_at", { ascending: false })

    if (error) throw error

    const queueData = (data || []) as QueueItem[]
    setItems(queueData)
    if (focusUserId) {
      setSelectedUserId(focusUserId)
      const focused = queueData.find((item) => item.user_id === focusUserId)
      if (focused) {
        setReviewNotes(focused.admin_notes || "")
      }
    }
  }

  const applyReview = async (reviewStatus: ReviewStatus) => {
    if (!selectedItem || !user) return

    setSaving(true)
    setFeedback("")

    try {
      const nextStatus: QueueStatus = reviewStatus === "approved" ? "approved" : "profile_completed"

      const { error: reviewError } = await supabase.from("onboarding_reviews").insert([
        {
          user_id: selectedItem.user_id,
          review_status: reviewStatus,
          review_notes: reviewNotes.trim() || null,
          reviewed_by: user.id,
        },
      ])

      if (reviewError) throw reviewError

      const profileUpdate: Record<string, string | null> = {
        status: nextStatus,
        admin_notes: reviewNotes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (reviewStatus === "approved") {
        profileUpdate.approved_at = new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from("onboarding_profiles")
        .update(profileUpdate)
        .eq("user_id", selectedItem.user_id)

      if (profileError) throw profileError

      const { error: eventError } = await supabase.from("onboarding_events").insert([
        {
          user_id: selectedItem.user_id,
          event_type: `admin_review_${reviewStatus}`,
          actor_user_id: user.id,
          actor_role: "admin",
          details: {
            notes: reviewNotes.trim() || null,
          },
        },
      ])

      if (eventError) throw eventError

      await refreshQueue(selectedItem.user_id)
      setFeedback(`Review saved: ${reviewStatus}.`)
    } catch (error) {
      console.error("Error applying onboarding review:", error)
      setFeedback("Failed to save review.")
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-golden" />
      </div>
    )
  }

  return (
    <AdminPageShell
      title="Onboarding Review Queue"
      description="Review student onboarding steps, leave notes, and approve or send back for changes."
      maxWidthClassName="max-w-7xl"
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Queue</h2>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-600">No onboarding records yet.</p>
            ) : (
              items.map((item) => {
                const selected = item.user_id === selectedUserId
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedUserId(item.user_id)
                      setReviewNotes(item.admin_notes || "")
                    }}
                    className={`w-full border-b border-slate-100 px-4 py-4 text-left transition-colors ${
                      selected ? "bg-golden/10" : "hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-darkText">
                      {item.legal_first_name || "-"} {item.legal_last_name || ""}
                    </p>
                    <p className="text-xs text-slate-600">{item.email || "No email captured"}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      <span>Status: {item.status}</span>
                      <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedItem ? (
            <>
              <h2 className="text-xl font-semibold text-darkText">Applicant Review</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium text-slate-800">
                    {selectedItem.legal_first_name || "-"} {selectedItem.legal_last_name || ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-800">{selectedItem.email || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-medium text-slate-800">{selectedItem.phone || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Certificate Goal</dt>
                  <dd className="font-medium text-slate-800">{selectedItem.certificate_goal || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Current Status</dt>
                  <dd className="font-medium text-slate-800">{selectedItem.status}</dd>
                </div>
              </dl>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-700">Admin Notes</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows={5}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add approval notes, missing items, or next actions"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyReview("approved")}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => applyReview("needs_changes")}
                  disabled={saving}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => applyReview("rejected")}
                  disabled={saving}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Select an onboarding record to review.</p>
          )}

          {feedback && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {feedback}
            </div>
          )}
        </div>
      </div>
    </AdminPageShell>
  )
}
