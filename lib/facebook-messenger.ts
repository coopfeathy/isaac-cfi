/**
 * Facebook Messenger Platform API client.
 *
 * Wraps the Graph API v19.0 Send API + User Profile API.
 * Requires env vars:
 *   - FB_PAGE_ACCESS_TOKEN   (long-lived page token)
 *   - FB_APP_SECRET          (used for webhook signature verification)
 *   - FB_VERIFY_TOKEN        (your custom string for webhook subscription)
 */

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FBMessageEvent {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message?: {
    mid: string
    text?: string
    attachments?: Array<{ type: string; payload: { url?: string } }>
    quick_reply?: { payload: string }
  }
  postback?: {
    title: string
    payload: string
  }
}

export interface FBWebhookEntry {
  id: string
  time: number
  messaging: FBMessageEvent[]
}

export interface FBWebhookBody {
  object: string
  entry: FBWebhookEntry[]
}

export interface FBQuickReply {
  content_type: 'text'
  title: string
  payload: string
}

export interface FBSendMessagePayload {
  recipient: { id: string }
  messaging_type: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG'
  message: {
    text?: string
    quick_replies?: FBQuickReply[]
  }
}

export interface FBUserProfile {
  first_name?: string
  last_name?: string
  profile_pic?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPageToken(): string {
  const token = process.env.FB_PAGE_ACCESS_TOKEN
  if (!token) throw new Error('Missing FB_PAGE_ACCESS_TOKEN env var')
  return token
}

// ─── Send a text message ────────────────────────────────────────────────────

export async function sendTextMessage(
  recipientId: string,
  text: string,
  quickReplies?: FBQuickReply[]
): Promise<{ message_id: string }> {
  const payload: FBSendMessagePayload = {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: { text },
  }

  if (quickReplies && quickReplies.length > 0) {
    payload.message.quick_replies = quickReplies
  }

  const res = await fetch(`${GRAPH_BASE}/me/messages?access_token=${getPageToken()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[FB Send] Error:', JSON.stringify(err))
    throw new Error(`Facebook Send API error: ${res.status} ${JSON.stringify(err)}`)
  }

  return res.json()
}

// ─── Send typing indicator ──────────────────────────────────────────────────

export async function sendTypingIndicator(
  recipientId: string,
  action: 'typing_on' | 'typing_off' = 'typing_on'
): Promise<void> {
  await fetch(`${GRAPH_BASE}/me/messages?access_token=${getPageToken()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      sender_action: action,
    }),
  }).catch((err) => console.warn('[FB Typing] Failed:', err))
}

// ─── Get user profile ───────────────────────────────────────────────────────

export async function getUserProfile(psid: string): Promise<FBUserProfile | null> {
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${psid}?fields=first_name,last_name,profile_pic&access_token=${getPageToken()}`
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// ─── Verify webhook signature ───────────────────────────────────────────────

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) return false

  const appSecret = process.env.FB_APP_SECRET
  if (!appSecret) {
    console.error('[FB Webhook] Missing FB_APP_SECRET')
    return false
  }

  // signature format: "sha256=<hex>"
  const expectedPrefix = 'sha256='
  if (!signature.startsWith(expectedPrefix)) return false

  const signatureHash = signature.slice(expectedPrefix.length)

  // Use Web Crypto API (available in Next.js edge + Node 18+)
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expectedHash = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return signatureHash === expectedHash
}
