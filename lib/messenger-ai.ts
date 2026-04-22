/**
 * AI Conversation Engine for the Facebook Messenger auto-responder.
 *
 * Uses the Anthropic Claude API to generate contextual, friendly replies
 * that guide prospects toward scheduling a discovery flight.
 *
 * The system prompt grounds the AI with Merlin Flight Training info
 * and a clear objective: collect contact info → schedule a discovery flight.
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendTextMessage, sendTypingIndicator, getUserProfile } from '@/lib/facebook-messenger'
import type { FBQuickReply } from '@/lib/facebook-messenger'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConversationRow {
  id: string
  fb_sender_id: string
  sender_name: string | null
  status: string
  phone: string | null
  email: string | null
  notes: string | null
  appointment_date: string | null
}

interface MessageRow {
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a friendly, professional AI assistant for **Merlin Flight Training**, a flight school run by Isaac Prestwich, CFII, based in the United States.

## Your mission
Guide every conversation toward scheduling a **discovery flight** — a paid introductory flight lesson ($250, ~90 minutes) where the prospect gets hands-on stick time with a certified instructor. This is the #1 entry point for new students.

## Key facts about Merlin Flight Training
- Discovery flights cost $250 and last about 90 minutes.
- Discovery flights are available on weekends (Saturday & Sunday), typically starting at 10:00 AM Eastern.
- After a discovery flight, students can begin Private Pilot training.
- Training is conducted in well-maintained aircraft with experienced CFIs.
- The flight school website is: https://merlinflighttraining.com
- To book a discovery flight online: https://merlinflighttraining.com/discovery-flight
- To start full training: https://merlinflighttraining.com/start-training
- Location details and more info are on the website.

## Conversation strategy
1. **Greet warmly** — acknowledge their interest in flying.
2. **Answer questions** — about flying, costs, requirements, timeline, what to expect. Be helpful and encouraging but concise.
3. **Collect info** — Try to naturally learn their first name, and when they seem interested, ask for their preferred date/time and the best phone number or email to confirm the booking.
4. **Schedule** — Once you have a name + contact info + preferred time, let them know you'll get them booked and someone will confirm shortly. Suggest they can also book directly at the website link.
5. **Handle objections** — Common ones: "Is it safe?", "I'm nervous", "Is it expensive?", "How long does training take?". Be reassuring, factual, and enthusiastic.

## Tone & rules
- Friendly, warm, and enthusiastic about aviation — but never pushy or salesy.
- Keep messages SHORT (2-4 sentences max per reply). People are on Messenger, not reading emails.
- Use casual but professional language. Light aviation enthusiasm is great.
- If someone asks something you don't know (specific aircraft types, instructor schedules), say you'll have the team follow up.
- If someone wants to opt out or isn't interested, respect that gracefully.
- NEVER make up specific available dates/times — instead say "weekends are usually available" and offer to have the team confirm a specific slot.
- NEVER discuss pricing for full training programs — only discovery flight pricing ($250). For training costs, direct them to the website or say the team can provide a detailed breakdown.
- If the conversation has clearly concluded (they've booked or said goodbye), end warmly.

## Information extraction
When you detect the following in the user's messages, note them naturally in conversation:
- **Name** — Use it going forward once you learn it.
- **Phone number** — Confirm you have it right.
- **Email** — Confirm you have it right.
- **Preferred date/time** — Acknowledge and say you'll check availability.

## Quick replies
When appropriate, suggest quick reply options by ending your message with a line like:
[QUICK_REPLIES: "Book a Discovery Flight", "Tell me more", "What does it cost?"]
The system will convert these into Facebook quick reply buttons. Use them sparingly — only when they naturally fit the flow.`

// ─── Anthropic API call ─────────────────────────────────────────────────────

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

async function callClaude(messages: AnthropicMessage[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY env var')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[Claude API] Error:', JSON.stringify(err))
    throw new Error(`Claude API error: ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || "Hey! Thanks for reaching out. I'd love to help you learn about flying. What can I tell you about?"
}

// ─── Parse quick replies from AI response ───────────────────────────────────

function parseQuickReplies(text: string): { cleanText: string; quickReplies: FBQuickReply[] } {
  const match = text.match(/\[QUICK_REPLIES:\s*(.+?)\]\s*$/)
  if (!match) return { cleanText: text, quickReplies: [] }

  const cleanText = text.replace(/\[QUICK_REPLIES:\s*.+?\]\s*$/, '').trim()
  const replies: FBQuickReply[] = []

  // Parse quoted strings from the match
  const replyMatches = match[1].matchAll(/"([^"]+)"/g)
  for (const m of replyMatches) {
    if (replies.length < 11) { // FB max 11 quick replies
      replies.push({
        content_type: 'text',
        title: m[1].slice(0, 20), // FB max 20 chars
        payload: m[1].toUpperCase().replace(/\s+/g, '_').slice(0, 1000),
      })
    }
  }

  return { cleanText, quickReplies: replies }
}

// ─── Extract contact info from message ──────────────────────────────────────

function extractContactInfo(text: string): { phone?: string; email?: string } {
  const result: { phone?: string; email?: string } = {}

  // Phone: various US formats
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
  if (phoneMatch) result.phone = phoneMatch[0]

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) result.email = emailMatch[0]

  return result
}

// ─── Main handler: process an incoming message ──────────────────────────────

export async function handleIncomingMessage(
  senderId: string,
  messageText: string,
  fbMessageId?: string
): Promise<void> {
  const supabase = getSupabaseAdmin()

  // 1. Find or create conversation
  let { data: conversation } = await supabase
    .from('messenger_conversations')
    .select('*')
    .eq('fb_sender_id', senderId)
    .single<ConversationRow>()

  if (!conversation) {
    // New conversation — try to get the user's name from Facebook
    const profile = await getUserProfile(senderId)
    const senderName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
      : null

    const { data: newConvo, error: insertError } = await supabase
      .from('messenger_conversations')
      .insert({
        fb_sender_id: senderId,
        sender_name: senderName,
        status: 'active',
      })
      .select()
      .single<ConversationRow>()

    if (insertError || !newConvo) {
      console.error('[Messenger AI] Failed to create conversation:', insertError)
      return
    }
    conversation = newConvo
  }

  // 2. Don't respond if conversation is opted out or archived
  if (conversation.status === 'opted_out' || conversation.status === 'archived') {
    return
  }

  // 3. Save the incoming message
  await supabase.from('messenger_messages').insert({
    conversation_id: conversation.id,
    role: 'user',
    content: messageText,
    fb_message_id: fbMessageId || null,
  })

  // 4. Extract any contact info from this message
  const contactInfo = extractContactInfo(messageText)
  const updates: Record<string, string> = {}
  if (contactInfo.phone && !conversation.phone) updates.phone = contactInfo.phone
  if (contactInfo.email && !conversation.email) updates.email = contactInfo.email

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('messenger_conversations')
      .update(updates)
      .eq('id', conversation.id)
  }

  // 5. Load conversation history for context (last 20 messages)
  const { data: history } = await supabase
    .from('messenger_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .limit(20)
    .returns<MessageRow[]>()

  // 6. Build messages array for Claude
  const claudeMessages: AnthropicMessage[] = (history || [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  // 7. Show typing indicator
  await sendTypingIndicator(senderId, 'typing_on')

  // 8. Generate AI response
  let aiResponse: string
  try {
    aiResponse = await callClaude(claudeMessages)
  } catch (err) {
    console.error('[Messenger AI] Claude API failed:', err)
    aiResponse =
      "Thanks for your message! I'm having a brief technical hiccup. Our team will get back to you shortly, or you can check out our website at merlinflighttraining.com"
  }

  // 9. Parse quick replies and send
  const { cleanText, quickReplies } = parseQuickReplies(aiResponse)

  try {
    await sendTextMessage(
      senderId,
      cleanText,
      quickReplies.length > 0 ? quickReplies : undefined
    )
  } catch (err) {
    console.error('[Messenger AI] Failed to send reply:', err)
  }

  // 10. Save the AI response
  await supabase.from('messenger_messages').insert({
    conversation_id: conversation.id,
    role: 'assistant',
    content: cleanText,
  })

  // 11. Turn off typing indicator
  await sendTypingIndicator(senderId, 'typing_off')
}
