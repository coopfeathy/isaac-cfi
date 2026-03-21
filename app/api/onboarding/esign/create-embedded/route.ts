import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const DROPBOX_SIGN_BASE_URL = "https://api.hellosign.com/v3"

const requiredDocTypes = ["waiver", "training_agreement", "policy_acknowledgement"] as const

function toFormBody(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) return
    params.set(key, String(value))
  })
  return params
}

async function dropboxSignRequest(path: string, apiKey: string, body: URLSearchParams) {
  const auth = Buffer.from(`${apiKey}:`).toString("base64")
  const response = await fetch(`${DROPBOX_SIGN_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  const json = await response.json()
  if (!response.ok) {
    const message = json?.error?.error_msg || "Dropbox Sign request failed"
    throw new Error(message)
  }

  return json
}

export async function POST(req: Request) {
  try {
    const provider = process.env.ESIGN_PROVIDER || "docuseal"

    const payload = await req.json()
    const accessToken: string | undefined = payload?.accessToken

    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !userData.user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
    }

    const user = userData.user

    const { data: onboardingProfile, error: profileError } = await supabaseAdmin
      .from("onboarding_profiles")
      .select("user_id, email, legal_first_name, legal_last_name")
      .eq("user_id", user.id)
      .single()

    if (profileError || !onboardingProfile) {
      return NextResponse.json({ error: "Onboarding profile not found. Save profile before signing." }, { status: 400 })
    }

    const signerName = [onboardingProfile.legal_first_name, onboardingProfile.legal_last_name].filter(Boolean).join(" ") || user.email || "Student"
    const signerEmail = onboardingProfile.email || user.email

    if (!signerEmail) {
      return NextResponse.json({ error: "Missing signer email" }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (provider === "docuseal") {
      const docusealFormUrl = process.env.DOCUSEAL_FORM_URL

      if (!docusealFormUrl) {
        return NextResponse.json(
          { error: "Missing DOCUSEAL_FORM_URL for ESIGN_PROVIDER=docuseal" },
          { status: 500 }
        )
      }

      const url = new URL(docusealFormUrl)
      // DocuSeal embedded form supports prefill through data attributes; include signer identity in query for host-side parsing.
      url.searchParams.set("email", signerEmail)
      url.searchParams.set("name", signerName)
      url.searchParams.set("external_id", user.id)

      const envelopeId = `docuseal-${user.id}-${Date.now()}`

      const documentRows = requiredDocTypes.map((docType) => ({
        user_id: user.id,
        doc_type: docType,
        file_bucket: "onboarding-private",
        file_path: `esign/${envelopeId}/${docType}.pdf`,
        upload_status: "uploaded",
        provider_envelope_id: envelopeId,
        provider_status: "sent",
        metadata: {
          provider: "docuseal",
          external_id: user.id,
        },
        uploaded_at: now,
      }))

      const { error: docsInsertError } = await supabaseAdmin.from("onboarding_documents").insert(documentRows)
      if (docsInsertError) throw docsInsertError

      const { error: profileUpdateError } = await supabaseAdmin
        .from("onboarding_profiles")
        .update({
          status: "id_uploaded",
          updated_at: now,
        })
        .eq("user_id", user.id)
        .neq("status", "approved")

      if (profileUpdateError) throw profileUpdateError

      const { error: eventError } = await supabaseAdmin.from("onboarding_events").insert([
        {
          user_id: user.id,
          event_type: "esign_embedded_started",
          actor_user_id: user.id,
          actor_role: "student",
          details: {
            provider: "docuseal",
            envelopeId,
            signUrl: url.toString(),
          },
        },
      ])
      if (eventError) throw eventError

      return NextResponse.json({ signUrl: url.toString(), envelopeId })
    }

    if (provider !== "dropbox_sign") {
      return NextResponse.json({ error: `Unsupported ESIGN_PROVIDER: ${provider}` }, { status: 400 })
    }

    const apiKey = process.env.DROPBOX_SIGN_API_KEY
    const clientId = process.env.DROPBOX_SIGN_CLIENT_ID
    const templateId = process.env.DROPBOX_SIGN_TEMPLATE_ID
    const signerRole = process.env.DROPBOX_SIGN_SIGNER_ROLE || "Student"
    const testMode = process.env.DROPBOX_SIGN_TEST_MODE === "0" ? 0 : 1
    const redirectUrl = process.env.DROPBOX_SIGN_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SITE_URL || ""}/onboarding`

    if (!apiKey || !clientId || !templateId) {
      return NextResponse.json(
        { error: "Missing DROPBOX_SIGN_API_KEY, DROPBOX_SIGN_CLIENT_ID, or DROPBOX_SIGN_TEMPLATE_ID" },
        { status: 500 }
      )
    }

    const requestBody = toFormBody({
      client_id: clientId,
      template_id: templateId,
      test_mode: testMode,
      subject: "Merlin Flight Training Onboarding Documents",
      message: "Please review and sign your onboarding documents.",
      "signers[0][email_address]": signerEmail,
      "signers[0][name]": signerName,
      "signers[0][role]": signerRole,
      "metadata[user_id]": user.id,
      "metadata[source]": "onboarding_phase_2",
    })

    const signatureResponse = await dropboxSignRequest(
      "/signature_request/create_embedded_with_template",
      apiKey,
      requestBody
    )

    const signatureRequest = signatureResponse?.signature_request
    const signature = signatureRequest?.signatures?.[0]
    const envelopeId = signatureRequest?.signature_request_id

    if (!signature?.signature_id || !envelopeId) {
      throw new Error("Dropbox Sign response missing signature ID or request ID")
    }

    const signUrlResponse = await dropboxSignRequest(
      `/embedded/sign_url/${signature.signature_id}`,
      apiKey,
      toFormBody({
        redirect_url: redirectUrl,
      })
    )

    const signUrl = signUrlResponse?.embedded?.sign_url
    if (!signUrl) {
      throw new Error("Failed to get embedded sign URL")
    }

    const documentRows = requiredDocTypes.map((docType) => ({
      user_id: user.id,
      doc_type: docType,
      file_bucket: "onboarding-private",
      file_path: `esign/${envelopeId}/${docType}.pdf`,
      upload_status: "uploaded",
      provider_envelope_id: envelopeId,
      provider_status: signatureRequest?.is_complete ? "completed" : "sent",
      metadata: {
        provider: "dropbox_sign",
        signature_request_id: envelopeId,
      },
      uploaded_at: now,
    }))

    const { error: docsInsertError } = await supabaseAdmin.from("onboarding_documents").insert(documentRows)
    if (docsInsertError) throw docsInsertError

    const { error: profileUpdateError } = await supabaseAdmin
      .from("onboarding_profiles")
      .update({
        status: "id_uploaded",
        updated_at: now,
      })
      .eq("user_id", user.id)
      .neq("status", "approved")

    if (profileUpdateError) throw profileUpdateError

    const { error: eventError } = await supabaseAdmin.from("onboarding_events").insert([
      {
        user_id: user.id,
        event_type: "esign_embedded_started",
        actor_user_id: user.id,
        actor_role: "student",
        details: {
          provider: "dropbox_sign",
          envelopeId,
        },
      },
    ])
    if (eventError) throw eventError

    return NextResponse.json({ signUrl, envelopeId })
  } catch (error) {
    console.error("Create embedded signing error:", error)
    const message = error instanceof Error ? error.message : "Failed to create embedded signing session"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
