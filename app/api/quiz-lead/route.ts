import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import {
  QUIZ_EMAIL_FROM,
  QUIZ_EMAIL_REPLY_TO,
  ISAAC_EMAIL,
  renderQuizResultYes,
  renderQuizResultMaybe,
  renderQuizResultNo,
  renderQuizLeadNotification,
} from '@/lib/email/quiz-result'

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      fullName: string
      email: string
      outcome: 'yes' | 'maybe' | 'no'
      answers?: Record<string, string>
    }

    const { fullName, email, outcome, answers = {} } = body

    if (!fullName || !email || !outcome) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── 1. Upsert into prospects ─────────────────────────────────────────────
    const supabase = getSupabaseAdmin()

    const interestMap = { yes: 'high', maybe: 'medium', no: 'low' } as const
    const statusMap   = { yes: 'new',  maybe: 'new',    no: 'new'  } as const

    // Check for existing prospect with same email + source=quiz so we don't dupe
    const { data: existing } = await supabase
      .from('prospects')
      .select('id')
      .eq('email', email)
      .eq('source', 'quiz')
      .maybeSingle()

    let prospectId: string

    if (existing) {
      // Update the existing record with fresh data
      const { data: updated, error: updateErr } = await supabase
        .from('prospects')
        .update({
          full_name:      fullName,
          interest_level: interestMap[outcome],
          status:         statusMap[outcome],
          lead_stage:     'quiz_complete',
          notes:          JSON.stringify({ outcome, answers, updated_at: new Date().toISOString() }),
          updated_at:     new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single()

      if (updateErr) throw updateErr
      prospectId = updated.id
    } else {
      // Insert new prospect
      const { data: inserted, error: insertErr } = await supabase
        .from('prospects')
        .insert({
          full_name:      fullName,
          email,
          source:         'quiz',
          interest_level: interestMap[outcome],
          status:         statusMap[outcome],
          lead_stage:     'quiz_complete',
          sequence_step:  0,
          notes:          JSON.stringify({ outcome, answers }),
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr
      prospectId = inserted.id
    }

    // ── 2. Add card to prospect Kanban board (new-inquiry column) ───────────
    // Only add a new card — don't duplicate if this email already has one.
    if (!existing) {
      try {
        const { data: kanbanRow } = await supabase
          .from('admin_kanban_state')
          .select('data')
          .eq('id', 'prospect-board')
          .single()

        if (kanbanRow?.data) {
          const kanban = kanbanRow.data as {
            boards: Array<{
              id: string
              cards: Array<Record<string, unknown>>
            }>
          }

          const prospectBoard = kanban.boards.find((b) => b.id === 'prospect-board')
          if (prospectBoard) {
            const outcomeLabel = outcome === 'yes' ? 'Quiz: Yes ✓' : outcome === 'maybe' ? 'Quiz: Maybe' : 'Quiz: Not Yet'
            const outcomeColor = outcome === 'yes' ? 'green' : outcome === 'maybe' ? 'yellow' : 'pink'

            // Build a human-readable notes string from quiz answers
            const ANSWER_LABELS: Record<string, Record<string, string>> = {
              age:      { under_17: 'Under 17', '17_25': '17–25', '25_40': '25–40', '40_plus': '40+' },
              citizen:  { citizen: 'U.S. Citizen', green_card: 'Perm. Resident', visa: 'On a Visa', unsure_citizen: 'Not sure' },
              medical:  { healthy: 'Healthy', minor: 'Minor issues', serious: 'Serious condition', denied: 'Previously denied' },
              finance:  { ready: 'Ready to invest', finance: 'Wants financing', exploring: 'Still budgeting', timing: 'Depends on timing' },
              schedule: { asap: 'ASAP', month: 'Within a month', quarter: 'Within 3–6 months', exploring: 'Just exploring' },
              timeline: { fast: 'As fast as possible', steady: 'Steady pace', slow: 'Slow & steady', flexible: 'No preference' },
            }
            const answerLines = Object.entries(answers)
              .map(([k, v]) => `${k}: ${ANSWER_LABELS[k]?.[v] ?? v}`)
              .join('\n')

            const newCard: Record<string, unknown> = {
              id:                   `card-${crypto.randomUUID()}`,
              title:                fullName,
              status:               'new-inquiry',
              color:                outcomeColor,
              priority:             outcome === 'yes' ? 'high' : 'medium',
              owner:                'Isaac Prestwich',
              labels:               [email, outcomeLabel],
              notes:                `Quiz lead (${outcomeLabel})\n\n${answerLines}`,
              due:                  '',
              order:                Date.now(),
              createdAt:            Date.now(),
              dueReminderSentAt:    null,
              dueReminderEmailId:   null,
              dueReminderSentFor:   null,
            }

            prospectBoard.cards.push(newCard)

            await supabase
              .from('admin_kanban_state')
              .update({ data: kanban, updated_at: new Date().toISOString() })
              .eq('id', 'prospect-board')
          }
        }
      } catch (kanbanErr) {
        // Non-fatal — log but don't fail the whole request
        console.error('[quiz-lead] kanban update failed:', kanbanErr)
      }
    }

    // ── 4. Send outcome-specific email to lead ───────────────────────────────
    const leadEmail =
      outcome === 'yes'   ? renderQuizResultYes(fullName)   :
      outcome === 'maybe' ? renderQuizResultMaybe(fullName) :
                            renderQuizResultNo(fullName)

    await resend.emails.send({
      from:     QUIZ_EMAIL_FROM,
      to:       email,
      replyTo:  QUIZ_EMAIL_REPLY_TO,
      subject:  leadEmail.subject,
      html:     leadEmail.html,
      text:     leadEmail.text,
    })

    // ── 5. Send notification to Isaac ────────────────────────────────────────
    const notification = renderQuizLeadNotification({
      prospectId,
      fullName,
      email,
      outcome,
      answers,
    })

    await resend.emails.send({
      from:    QUIZ_EMAIL_FROM,
      to:      ISAAC_EMAIL,
      subject: notification.subject,
      html:    notification.html,
      text:    notification.text,
    })

    return NextResponse.json({ ok: true, prospectId })
  } catch (err) {
    console.error('[quiz-lead] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
