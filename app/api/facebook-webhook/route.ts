/**
 * Facebook Messenger Webhook API Route
 *
 * GET  — Webhook verification (Facebook sends a challenge on subscription)
 * POST — Incoming message events from Facebook
 *
 * Deployed at: /api/facebook-webhook
 * Facebook webhook URL: https://merlinflighttraining.com/api/facebook-webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/facebook-messenger'
import { handleIncomingMessage } from '@/lib/messenger-ai'
import type { FBWebhookBody } from '@/lib/facebook-messenger'

// ─── GET: Webhook Verification ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.FB_VERIFY_TOKEN

  if (!verifyToken) {
    console.error('[FB Webhook] Missing FB_VERIFY_TOKEN env var')
    return new NextResponse('Server configuration error', { status: 500 })
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[FB Webhook] Verification successful')
    // Facebook expects the challenge echoed back as plain text
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn('[FB Webhook] Verification failed — token mismatch')
  return new NextResponse('Forbidden', { status: 403 })
}

// ─── POST: Incoming Messages ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Read raw body for signature verification
  const rawBody = await request.text()

  // 2. Verify webhook signature (skip in development if needed)
  const signature = request.headers.get('x-hub-signature-256')
  const isValid = await verifyWebhookSignature(rawBody, signature)

  if (!isValid && process.env.NODE_ENV === 'production') {
    console.warn('[FB Webhook] Invalid signature — rejecting')
    return new NextResponse('Invalid signature', { status: 403 })
  }

  // 3. Parse the webhook body
  let body: FBWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 4. Facebook requires a 200 response within 20 seconds.
  //    We process messages asynchronously to not block the response.
  if (body.object === 'page') {
    // Process each entry
    for (const entry of body.entry) {
      for (const event of entry.messaging) {
        // Handle text messages
        if (event.message?.text) {
          // Fire and forget — don't await to keep the response fast
          handleIncomingMessage(
            event.sender.id,
            event.message.text,
            event.message.mid
          ).catch((err) =>
            console.error('[FB Webhook] Error processing message:', err)
          )
        }

        // Handle postbacks (e.g., Get Started button)
        if (event.postback) {
          const postbackText =
            event.postback.payload === 'GET_STARTED'
              ? "Hi! I'm interested in learning to fly."
              : event.postback.title || 'Hello'

          handleIncomingMessage(event.sender.id, postbackText).catch((err) =>
            console.error('[FB Webhook] Error processing postback:', err)
          )
        }

        // Handle quick reply taps
        if (event.message?.quick_reply) {
          // The quick reply text is already in event.message.text,
          // so the text handler above will catch it. No extra handling needed.
        }
      }
    }

    // Always return 200 to Facebook
    return new NextResponse('EVENT_RECEIVED', { status: 200 })
  }

  // Not a page event
  return new NextResponse('Not Found', { status: 404 })
}
