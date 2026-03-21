"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type OnboardingStatus =
  | "account_created"
  | "profile_completed"
  | "id_uploaded"
  | "docs_signed"
  | "approved"

type OnboardingDocument = {
  id: string
  doc_type: string
  file_path: string
  upload_status: string
  uploaded_at: string
}

type OnboardingProfile = {
  id: string
  user_id: string
  email: string | null
  legal_first_name: string | null
  legal_last_name: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  emergency_name: string | null
  emergency_phone: string | null
  certificate_goal: string | null
  status: OnboardingStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

const orderedStatuses: OnboardingStatus[] = [
  "account_created",
  "profile_completed",
  "id_uploaded",
  "docs_signed",
  "approved",
]

const statusLabels: Record<OnboardingStatus, string> = {
  account_created: "Account created",
  profile_completed: "Profile completed",
  id_uploaded: "ID uploaded",
  docs_signed: "Documents signed",
  approved: "Approved",
}

const requiredIdDocs = new Set(["government_id_front", "government_id_back"])

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null)
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)
  const [documents, setDocuments] = useState<OnboardingDocument[]>([])
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [launchingESign, setLaunchingESign] = useState(false)

  const [formData, setFormData] = useState({
    legal_first_name: "",
    legal_last_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    emergency_name: "",
    emergency_phone: "",
    certificate_goal: "private_pilot",
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  const idDocsUploaded = useMemo(() => {
    const uploadedTypes = new Set(
      documents
        .filter((doc) => doc.upload_status === "uploaded" || doc.upload_status === "signed")
        .map((doc) => doc.doc_type)
    )

    return [...requiredIdDocs].every((docType) => uploadedTypes.has(docType))
  }, [documents])

  const activeStatus: OnboardingStatus = profile?.status || "account_created"
  const activeStatusIndex = orderedStatuses.indexOf(activeStatus)

  const loadOnboardingData = async () => {
    if (!user) return

    setLoading(true)
    try {
      const [{ data: profileData, error: profileError }, { data: docsData, error: docsError }] = await Promise.all([
        supabase
          .from("onboarding_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("onboarding_documents")
          .select("id, doc_type, file_path, upload_status, uploaded_at")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false }),
      ])

      if (profileError) throw profileError
      if (docsError) throw docsError

      if (!profileData) {
        const { data: createdProfile, error: createError } = await supabase
          .from("onboarding_profiles")
          .insert([
            {
              user_id: user.id,
              email: user.email || null,
              status: "account_created",
            },
          ])
          .select("*")
          .single()

        if (createError) throw createError
        setProfile(createdProfile)
      } else {
        setProfile(profileData)
      }

      setDocuments(docsData || [])

      const sourceProfile = profileData
      if (sourceProfile) {
        setFormData({
          legal_first_name: sourceProfile.legal_first_name || "",
          legal_last_name: sourceProfile.legal_last_name || "",
          phone: sourceProfile.phone || "",
          address_line1: sourceProfile.address_line1 || "",
          address_line2: sourceProfile.address_line2 || "",
          city: sourceProfile.city || "",
          state: sourceProfile.state || "",
          zip: sourceProfile.zip || "",
          emergency_name: sourceProfile.emergency_name || "",
          emergency_phone: sourceProfile.emergency_phone || "",
          certificate_goal: sourceProfile.certificate_goal || "private_pilot",
        })
      }
    } catch (error) {
      console.error("Error loading onboarding data:", error)
      setStatusMessage("Failed to load onboarding data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadOnboardingData()
  }, [user])

  const logEvent = async (eventType: string, details: Record<string, unknown>) => {
    if (!user) return

    await supabase.from("onboarding_events").insert([
      {
        user_id: user.id,
        event_type: eventType,
        actor_user_id: user.id,
        actor_role: "student",
        details,
      },
    ])
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setStatusMessage("")

    try {
      const trimmed = {
        legal_first_name: formData.legal_first_name.trim(),
        legal_last_name: formData.legal_last_name.trim(),
        phone: formData.phone.trim(),
        address_line1: formData.address_line1.trim(),
        address_line2: formData.address_line2.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip: formData.zip.trim(),
        emergency_name: formData.emergency_name.trim(),
        emergency_phone: formData.emergency_phone.trim(),
        certificate_goal: formData.certificate_goal,
      }

      if (!trimmed.legal_first_name || !trimmed.legal_last_name || !trimmed.phone || !trimmed.address_line1 || !trimmed.city || !trimmed.state || !trimmed.zip || !trimmed.emergency_name || !trimmed.emergency_phone) {
        setStatusMessage("Please complete all required fields before saving.")
        setSaving(false)
        return
      }

      const nextStatus: OnboardingStatus = profile?.status === "approved"
        ? "approved"
        : profile?.status === "docs_signed"
          ? "docs_signed"
          : idDocsUploaded
            ? "id_uploaded"
            : "profile_completed"

      const { data, error } = await supabase
        .from("onboarding_profiles")
        .upsert(
          [
            {
              user_id: user.id,
              email: user.email || null,
              ...trimmed,
              status: nextStatus,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "user_id" }
        )
        .select("*")
        .single()

      if (error) throw error

      setProfile(data)
      await logEvent("profile_saved", { status: nextStatus })
      setStatusMessage("Profile saved.")
    } catch (error) {
      console.error("Error saving onboarding profile:", error)
      setStatusMessage("Failed to save profile.")
    } finally {
      setSaving(false)
    }
  }

  const handleDocumentUpload = async (docType: "government_id_front" | "government_id_back", file: File | null) => {
    if (!user || !file) return

    setUploadingDocType(docType)
    setStatusMessage("")

    try {
      const sanitized = file.name.replace(/\s+/g, "-").toLowerCase()
      const filePath = `${user.id}/${docType}-${Date.now()}-${sanitized}`

      const { error: uploadError } = await supabase.storage
        .from("onboarding-private")
        .upload(filePath, file, { upsert: false, cacheControl: "3600" })

      if (uploadError) throw uploadError

      const { error: docError } = await supabase.from("onboarding_documents").insert([
        {
          user_id: user.id,
          doc_type: docType,
          file_bucket: "onboarding-private",
          file_path: filePath,
          upload_status: "uploaded",
        },
      ])

      if (docError) throw docError

      await logEvent("id_uploaded", { docType })

      const updatedDocs = [
        ...documents,
        {
          id: `${Date.now()}`,
          doc_type: docType,
          file_path: filePath,
          upload_status: "uploaded",
          uploaded_at: new Date().toISOString(),
        },
      ]
      setDocuments(updatedDocs)

      const nowHasBoth = [...requiredIdDocs].every((requiredDoc) =>
        updatedDocs.some((doc) => doc.doc_type === requiredDoc && (doc.upload_status === "uploaded" || doc.upload_status === "signed"))
      )

      const nextStatus: OnboardingStatus = profile?.status === "approved"
        ? "approved"
        : profile?.status === "docs_signed"
          ? "docs_signed"
          : nowHasBoth
            ? "id_uploaded"
            : "profile_completed"

      const { data: updatedProfile, error: profileError } = await supabase
        .from("onboarding_profiles")
        .update({
          status: nextStatus,
          id_document_uploaded_at: nowHasBoth ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select("*")
        .single()

      if (profileError) throw profileError

      setProfile(updatedProfile)
      setStatusMessage("Document uploaded successfully.")
    } catch (error) {
      console.error("Error uploading onboarding document:", error)
      setStatusMessage("Failed to upload document. Confirm the private bucket onboarding-private exists.")
    } finally {
      setUploadingDocType(null)
    }
  }

  const markDocumentsSigned = async () => {
    if (!user || !profile) return

    setSaving(true)
    setStatusMessage("")

    try {
      if (!idDocsUploaded) {
        setStatusMessage("Upload both front and back ID images before marking docs signed.")
        setSaving(false)
        return
      }

      const { data, error } = await supabase
        .from("onboarding_profiles")
        .update({
          status: profile.status === "approved" ? "approved" : "docs_signed",
          docs_signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select("*")
        .single()

      if (error) throw error

      setProfile(data)
      await logEvent("documents_marked_signed", { source: "manual_scaffold" })
      setStatusMessage("Document signing marked complete. Admin review is next.")
    } catch (error) {
      console.error("Error marking onboarding documents signed:", error)
      setStatusMessage("Failed to update signing status.")
    } finally {
      setSaving(false)
    }
  }

  const startEmbeddedSigning = async () => {
    if (!user) return

    setLaunchingESign(true)
    setStatusMessage("")

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Please sign in again to continue")
      }

      const response = await fetch("/api/onboarding/esign/create-embedded", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: sessionData.session.access_token,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to start signing")
      }

      if (result.signUrl) {
        window.open(result.signUrl, "_blank", "noopener,noreferrer")
      }

      setStatusMessage("Signing session created. Complete signing in the opened window, then return here.")
      await loadOnboardingData()
    } catch (error) {
      console.error("Error starting embedded signing:", error)
      const message = error instanceof Error ? error.message : "Failed to launch signing"
      setStatusMessage(`Could not start signing: ${message}`)
    } finally {
      setLaunchingESign(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-golden" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student Onboarding</p>
          <h1 className="mt-2 text-3xl font-bold text-darkText">Complete Your Training Onboarding</h1>
          <p className="mt-2 text-slate-600">
            Track every required step: profile intake, ID upload, signing, and admin approval.
          </p>
          <div className="mt-4 flex gap-3 flex-wrap">
            <Link href="/learn" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Back to Learn
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-darkText">Progress Tracker</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {orderedStatuses.map((status, index) => {
              const completed = index <= activeStatusIndex
              return (
                <div
                  key={status}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    completed ? "border-golden bg-golden/10 text-darkText" : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wide">Step {index + 1}</div>
                  <div className="mt-1 font-semibold">{statusLabels[status]}</div>
                </div>
              )
            })}
          </div>
          {profile?.admin_notes && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Admin note: {profile.admin_notes}
            </div>
          )}
        </div>

        <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-darkText">1. Personal Intake</h2>
          <p className="mt-1 text-sm text-slate-600">Fields marked * are required for review.</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Legal First Name *</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.legal_first_name}
                onChange={(e) => setFormData({ ...formData, legal_first_name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Legal Last Name *</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.legal_last_name}
                onChange={(e) => setFormData({ ...formData, legal_last_name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Phone *</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Certificate Goal *</span>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.certificate_goal}
                onChange={(e) => setFormData({ ...formData, certificate_goal: e.target.value })}
              >
                <option value="private_pilot">Private Pilot</option>
                <option value="instrument">Instrument Rating</option>
                <option value="commercial">Commercial Pilot</option>
                <option value="cfi">CFI</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Address Line 1 *</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Address Line 2</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">City *</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">State *</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ZIP *</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              />
            </label>
            <div />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Emergency Contact Name *</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.emergency_name}
                onChange={(e) => setFormData({ ...formData, emergency_name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Emergency Contact Phone *</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.emergency_phone}
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-lg bg-golden px-5 py-2.5 text-sm font-semibold text-darkText disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-darkText">2. Government ID Upload</h2>
          <p className="mt-1 text-sm text-slate-600">Upload clear images or PDFs for front and back ID.</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block rounded-lg border border-slate-200 p-4">
              <span className="text-sm font-medium text-slate-700">ID Front *</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="mt-2 block w-full text-sm"
                onChange={(e) => handleDocumentUpload("government_id_front", e.target.files?.[0] || null)}
                disabled={uploadingDocType !== null}
              />
            </label>
            <label className="block rounded-lg border border-slate-200 p-4">
              <span className="text-sm font-medium text-slate-700">ID Back *</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="mt-2 block w-full text-sm"
                onChange={(e) => handleDocumentUpload("government_id_back", e.target.files?.[0] || null)}
                disabled={uploadingDocType !== null}
              />
            </label>
          </div>

          <div className="mt-4 text-sm text-slate-700">
            Required ID docs complete: <span className={idDocsUploaded ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>{idDocsUploaded ? "Yes" : "No"}</span>
          </div>

          {documents.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-200">
              <div className="grid grid-cols-3 gap-2 border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Type</span>
                <span>Status</span>
                <span>Uploaded</span>
              </div>
              {documents.slice(0, 6).map((doc) => (
                <div key={doc.id} className="grid grid-cols-3 gap-2 border-b px-3 py-2 text-sm text-slate-700 last:border-b-0">
                  <span>{doc.doc_type}</span>
                  <span>{doc.upload_status}</span>
                  <span>{new Date(doc.uploaded_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-darkText">3. Document Signing (Scaffold)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Launch DocuSeal signing for waiver/training agreement/policy docs. Webhook callbacks auto-update your status.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startEmbeddedSigning}
              disabled={launchingESign}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {launchingESign ? "Launching..." : "Start Embedded Signing"}
            </button>
            <button
              type="button"
              onClick={markDocumentsSigned}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? "Updating..." : "Manual Fallback: Mark Signed"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-darkText">4. Admin Review</h2>
          <p className="mt-1 text-sm text-slate-600">
            Once your status reaches approved, you are fully cleared for training onboarding.
          </p>
          <p className="mt-3 text-sm text-slate-700">
            Current status: <span className="font-semibold">{statusLabels[activeStatus]}</span>
          </p>
        </div>

        {statusMessage && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  )
}
