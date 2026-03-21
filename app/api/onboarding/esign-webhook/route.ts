import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import crypto from "node:crypto"

const COMPLETE_STATUSES = new Set(["completed", "signed", "done"])

function normalizeStatus(rawStatus: string) {
  const value = rawStatus.toLowerCase()
  if (value.includes("all_signed") || value.includes("complete") || value.includes("signed")) {
    return "completed"
  }
  return value
}

function verifyDropboxSignEventHash(eventTime: string, eventType: string, apiKey: string, eventHash: string | null) {
  if (!eventHash) return false
  const computed = crypto.createHash("sha256").update(`${eventTime}${eventType}${apiKey}`).digest("hex")
  return computed === eventHash
}

function isWebhookAuthorized(req: Request, webhookSecret: string | undefined) {
  if (!webhookSecret) return true

  const url = new URL(req.url)
  const querySecret = url.searchParams.get("secret")
  const xEsignSecret = req.headers.get("x-esign-secret")
  const xWebhookSecret = req.headers.get("x-webhook-secret")
  const authHeader = req.headers.get("authorization")

  if (xEsignSecret === webhookSecret) return true
  if (xWebhookSecret === webhookSecret) return true
  if (querySecret === webhookSecret) return true
  if (authHeader === `Bearer ${webhookSecret}`) return true

  return false
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || ""

    let payload: any = null
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      const json = form.get("json")
      if (typeof json === "string") {
        payload = JSON.parse(json)
      }
    } else {
      payload = await req.json()
    }

    if (!payload) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 })
    }

    const provider = process.env.ESIGN_PROVIDER || "docuseal"
    const webhookSecret = process.env.ESIGN_WEBHOOK_SECRET

    if (!isWebhookAuthorized(req, webhookSecret)) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    let userId: string | undefined
    let envelopeId: string | undefined
    let providerStatus = "unknown"

    if (provider === "dropbox_sign") {
      const eventType = payload?.event?.event_type || ""
      const eventTime = String(payload?.event?.event_time || "")
      const eventHash = payload?.event?.event_hash || null
      const apiKey = process.env.DROPBOX_SIGN_API_KEY

      if (!apiKey) {
        return NextResponse.json({ error: "Missing DROPBOX_SIGN_API_KEY" }, { status: 500 })
      }

      if (!eventType || !eventTime || !verifyDropboxSignEventHash(eventTime, eventType, apiKey, eventHash)) {
        return NextResponse.json({ error: "Invalid Dropbox Sign webhook signature" }, { status: 401 })
      }

      userId = payload?.signature_request?.metadata?.user_id
      envelopeId = payload?.signature_request?.signature_request_id
      providerStatus = normalizeStatus(eventType)
    } else if (provider === "docuseal") {
      const eventType = String(payload?.event_type || payload?.event?.type || payload?.type || payload?.status || "unknown")

      userId =
        payload?.external_id ||
        payload?.submission?.external_id ||
        payload?.submission?.metadata?.user_id ||
        payload?.metadata?.user_id ||
        payload?.userId

      envelopeId = payload?.submission_id || payload?.submission?.id || payload?.envelopeId || payload?.document_id
      providerStatus = normalizeStatus(eventType)
    } else {
      userId = payload?.userId
      envelopeId = payload?.envelopeId
      providerStatus = normalizeStatus(String(payload?.status || "unknown"))
    }

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const reviewTimestamp = new Date().toISOString()
    const uploadStatus = COMPLETE_STATUSES.has(providerStatus) ? "signed" : "uploaded"
    let matchedDocsCount = 0

    if (envelopeId) {
      const { data: envelopeUpdatedDocs, error: docError } = await supabaseAdmin
        .from("onboarding_documents")
        .update({
          provider_status: providerStatus,
          upload_status: uploadStatus,
          reviewed_at: reviewTimestamp,
        })
        .eq("user_id", userId)
        .eq("provider_envelope_id", envelopeId)
        .select("id")

      if (docError) throw docError
      matchedDocsCount = envelopeUpdatedDocs?.length || 0
    }

    // DocuSeal submissions can have IDs that differ from our local synthetic envelope IDs.
    // If no rows matched by envelope, update pending DocuSeal documents by user as a fallback.
    if (provider === "docuseal" && matchedDocsCount === 0) {
      const { error: docFallbackError } = await supabaseAdmin
        .from("onboarding_documents")
        .update({
          provider_status: providerStatus,
          upload_status: uploadStatus,
          reviewed_at: reviewTimestamp,
        })
        .eq("user_id", userId)
        .eq("file_bucket", "onboarding-private")
        .eq("metadata->>provider", "docuseal")
        .in("doc_type", ["waiver", "training_agreement", "policy_acknowledgement"])

      if (docFallbackError) throw docFallbackError
    }

    if (COMPLETE_STATUSES.has(providerStatus)) {
      const { error: profileError } = await supabaseAdmin
        .from("onboarding_profiles")
        .update({
          status: "docs_signed",
          docs_signed_at: reviewTimestamp,
          updated_at: reviewTimestamp,
        })
        .eq("user_id", userId)
        .neq("status", "approved")

      if (profileError) throw profileError
    }

    const { error: eventError } = await supabaseAdmin.from("onboarding_events").insert([
      {
        user_id: userId,
        event_type: "esign_webhook_received",
        actor_user_id: null,
        actor_role: "system",
        details: {
          envelopeId: envelopeId || null,
          providerStatus,
          provider,
          raw: payload,
        },
      },
    ])

    if (eventError) throw eventError

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("E-sign webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
