import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const supabaseAdmin = getSupabaseAdmin()

    const [
      onboardingDocs,
      failedWebhookEvents,
      openSupportTickets,
      totalProspects,
      convertedProspects,
      unresolvedIntegrityAlerts,
      latestIntegrityRun,
    ] = await Promise.all([
      supabaseAdmin
        .from('onboarding_documents')
        .select('id', { count: 'exact', head: true })
        .is('reviewed_at', null)
        .in('upload_status', ['uploaded', 'signed']),
      supabaseAdmin
        .from('stripe_webhook_events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabaseAdmin
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      supabaseAdmin
        .from('prospects')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'converted'),
      supabaseAdmin
        .from('booking_integrity_alerts')
        .select('id', { count: 'exact', head: true })
        .is('resolved_at', null),
      supabaseAdmin
        .from('booking_integrity_runs')
        .select('id, created_at, finished_at, error_message, stale_pending_count, canceled_pending_count, released_slot_count, paid_unbooked_count, booked_without_paid_count')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const totalProspectCount = totalProspects.count || 0
    const convertedProspectCount = convertedProspects.count || 0
    const conversionRate = totalProspectCount > 0
      ? Math.round((convertedProspectCount / totalProspectCount) * 1000) / 10
      : 0

    return NextResponse.json({
      unreviewedOnboardingDocs: onboardingDocs.count || 0,
      failedWebhookEvents: failedWebhookEvents.count || 0,
      openSupportTickets: openSupportTickets.count || 0,
      unresolvedIntegrityAlerts: unresolvedIntegrityAlerts.count || 0,
      prospectConversionRate: conversionRate,
      totalProspects: totalProspectCount,
      convertedProspects: convertedProspectCount,
      latestIntegrityRun: latestIntegrityRun.data || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
