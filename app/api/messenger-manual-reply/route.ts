/**
 * Manual Reply API — lets the admin send a message directly to a
 * Facebook Messenger user, bypassing the AI.
 *
 * POST /api/messenger-manual-reply
 * Body: { conversationId, fbSenderId, text }
 * Auth: Bearer token (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendTextMessage } from '@/lib/facebook-messenger'

export async function POST(request: NextRequest) {
  // 1. Admin auth check
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  // 2. Parse body
  const body = await request.json()
  const { conversationId, fbSenderId, text } = body as {
    conversationId?: string
    fbSenderId?: string
    text?: string
  }

  if (!conversationId || !fbSenderId || !text?.trim()) {
    return NextResponse.json(
      { error: 'Missing conversationId, fbSenderId, or text' },
      { status: 400 }
    )
  }

  // 3. Send message via Facebook
  try {
    await sendTextMessage(fbSenderId, text.trim())
  } catch (err) {
    console.error('[Manual Reply] Send failed:', err)
    return NextResponse.json(
      { error: 'Failed to send message via Facebook' },
      { status: 502 }
    )
  }

  // 4. Log the message in the database
  const supabase = getSupabaseAdmin()
  await supabase.from('messenger_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: `[MANUAL] ${text.trim()}`,
  })

  return NextResponse.json({ success: true })
}
