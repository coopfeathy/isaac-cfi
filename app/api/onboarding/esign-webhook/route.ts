import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const COMPLETE_STATUSES = new Set(["completed", "signed", "done"])

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.ESIGN_WEBHOOK_SECRET
    const incomingSecret = req.headers.get("x-esign-secret")

    if (webhookSecret && incomingSecret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 })
    }

    const payload = await req.json()
    const userId: string | undefined = payload?.userId
    const envelopeId: string | undefined = payload?.envelopeId
    const providerStatus: string = String(payload?.status || "unknown").toLowerCase()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    if (envelopeId) {
      const { error: docError } = await supabaseAdmin
        .from("onboarding_documents")
        .update({
          provider_status: providerStatus,
          upload_status: COMPLETE_STATUSES.has(providerStatus) ? "signed" : "uploaded",
          reviewed_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("provider_envelope_id", envelopeId)

      if (docError) throw docError
    }

    if (COMPLETE_STATUSES.has(providerStatus)) {
      const { error: profileError } = await supabaseAdmin
        .from("onboarding_profiles")
        .update({
          status: "docs_signed",
          docs_signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
