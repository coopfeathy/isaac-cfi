import type { Config, Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { emailTemplates } from '../../lib/resend'

export const config: Config = {
  schedule: '0 14 * * *',
}

const handler: Handler = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase environment variables' }),
    }
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing RESEND_API_KEY' }),
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const resend = new Resend(resendApiKey)

  // Calculate 3-day window: ±2 hours around the 3-day mark
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const windowStart = new Date(threeDaysAgo.getTime() - 2 * 60 * 60 * 1000)
  const windowEnd = new Date(threeDaysAgo.getTime() + 2 * 60 * 60 * 1000)

  const { data: prospects, error } = await supabaseAdmin
    .from('prospects')
    .select('id, email, full_name, lead_stage, sequence_step')
    .gte('created_at', windowStart.toISOString())
    .lte('created_at', windowEnd.toISOString())
    .lt('sequence_step', 2)
    .in('lead_stage', ['new', 'contacted'])

  if (error) {
    console.error('Day-3 followup query error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }

  let sent = 0
  for (const prospect of prospects ?? []) {
    try {
      await resend.emails.send({
        from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
        to: [prospect.email],
        subject: emailTemplates.prospectFollowUpDay3(prospect.full_name || 'there').subject,
        html: emailTemplates.prospectFollowUpDay3(prospect.full_name || 'there').html,
      })
      await supabaseAdmin
        .from('prospects')
        .update({ sequence_step: 2 })
        .eq('id', prospect.id)
      sent++
    } catch (emailErr) {
      console.error(`Day-3 email failed for prospect ${prospect.id}:`, emailErr)
    }
  }

  console.log(`Day-3 followup: sent ${sent} emails`)
  return {
    statusCode: 200,
    body: JSON.stringify({ sent }),
  }
}

export { handler }
