import type { Config, Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

type IntegrityAlertType =
  | 'paid_booking_unbooked_slot'
  | 'booked_slot_without_paid_booking'
  | 'pending_booking_stale'

type IntegrityAlert = {
  alert_type: IntegrityAlertType
  booking_id: string | null
  slot_id: string | null
  details: Record<string, unknown>
}

export const config: Config = {
  schedule: '*/5 * * * *',
}

const PAID_STATUSES = ['paid', 'confirmed', 'completed']
const PENDING_TIMEOUT_MINUTES = Number(process.env.BOOKING_PENDING_TIMEOUT_MINUTES || '30')
const ALERT_MIN_AGE_MINUTES = Number(process.env.ALERT_MIN_AGE_MINUTES || '15')
const ALERT_EMAIL_COOLDOWN_MINUTES = Number(process.env.ALERT_EMAIL_COOLDOWN_MINUTES || '60')
const WEBHOOK_FAILURE_LOOKBACK_MINUTES = Number(process.env.WEBHOOK_FAILURE_LOOKBACK_MINUTES || '1440')

async function sendOperationalAlertEmail(payload: {
  to: string
  subject: string
  body: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return false

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: [payload.to],
      subject: payload.subject,
      text: payload.body,
    }),
  })

  return response.ok
}

function shouldSendBasedOnCooldown(lastSentAt: string | null): boolean {
  if (!lastSentAt) return true
  const now = Date.now()
  const last = new Date(lastSentAt).getTime()
  const cooldownMs = ALERT_EMAIL_COOLDOWN_MINUTES * 60 * 1000
  return now - last >= cooldownMs
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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const now = new Date()
  const staleThreshold = new Date(now.getTime() - PENDING_TIMEOUT_MINUTES * 60 * 1000).toISOString()

  const runInsert = await supabaseAdmin
    .from('booking_integrity_runs')
    .insert([{ run_source: 'netlify-scheduled' }])
    .select('id')
    .single()

  if (runInsert.error || !runInsert.data?.id) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: runInsert.error?.message || 'Failed to create monitor run' }),
    }
  }

  const runId = runInsert.data.id

  try {
    const stalePendingResult = await supabaseAdmin
      .from('bookings')
      .select('id, slot_id, created_at')
      .eq('status', 'pending')
      .lt('created_at', staleThreshold)

    const stalePending = stalePendingResult.data || []
    if (stalePendingResult.error) throw stalePendingResult.error

    const stalePendingBookingIds = stalePending.map((row) => row.id)
    const stalePendingSlotIds = Array.from(new Set(stalePending.map((row) => row.slot_id).filter(Boolean))) as string[]

    let canceledPendingCount = 0
    if (stalePendingBookingIds.length > 0) {
      const cancelResult = await supabaseAdmin
        .from('bookings')
        .update({ status: 'canceled' })
        .in('id', stalePendingBookingIds)
        .select('id')

      if (cancelResult.error) throw cancelResult.error
      canceledPendingCount = (cancelResult.data || []).length
    }

    let releasedSlotCount = 0
    if (stalePendingSlotIds.length > 0) {
      const paidBookingsOnStaleSlots = await supabaseAdmin
        .from('bookings')
        .select('slot_id')
        .in('slot_id', stalePendingSlotIds)
        .in('status', PAID_STATUSES)

      if (paidBookingsOnStaleSlots.error) throw paidBookingsOnStaleSlots.error

      const protectedSlotIds = new Set((paidBookingsOnStaleSlots.data || []).map((row) => row.slot_id).filter(Boolean))
      const releasableSlotIds = stalePendingSlotIds.filter((slotId) => !protectedSlotIds.has(slotId))

      if (releasableSlotIds.length > 0) {
        const releaseResult = await supabaseAdmin
          .from('slots')
          .update({ is_booked: false })
          .in('id', releasableSlotIds)
          .select('id')

        if (releaseResult.error) throw releaseResult.error
        releasedSlotCount = (releaseResult.data || []).length
      }
    }

    const paidBookingsResult = await supabaseAdmin
      .from('bookings')
      .select('id, slot_id, status')
      .in('status', PAID_STATUSES)
      .not('slot_id', 'is', null)

    if (paidBookingsResult.error) throw paidBookingsResult.error
    const paidBookings = paidBookingsResult.data || []

    const paidBookingSlotIds = Array.from(new Set(paidBookings.map((row) => row.slot_id).filter(Boolean))) as string[]

    const paidBookingSlotsResult = paidBookingSlotIds.length === 0
      ? { data: [], error: null }
      : await supabaseAdmin
          .from('slots')
          .select('id, is_booked')
          .in('id', paidBookingSlotIds)

    if (paidBookingSlotsResult.error) throw paidBookingSlotsResult.error

    const slotBookedMap = new Map((paidBookingSlotsResult.data || []).map((row) => [row.id, row.is_booked]))

    const paidBookingUnbookedSlotAlerts: IntegrityAlert[] = paidBookings
      .filter((row) => row.slot_id && slotBookedMap.get(row.slot_id) === false)
      .map((row) => ({
        alert_type: 'paid_booking_unbooked_slot',
        booking_id: row.id,
        slot_id: row.slot_id,
        details: { bookingStatus: row.status },
      }))

    const bookedSlotsResult = await supabaseAdmin
      .from('slots')
      .select('id')
      .eq('is_booked', true)

    if (bookedSlotsResult.error) throw bookedSlotsResult.error

    const paidSlotIds = new Set(paidBookings.map((row) => row.slot_id).filter(Boolean))

    const bookedSlotWithoutPaidAlerts: IntegrityAlert[] = (bookedSlotsResult.data || [])
      .filter((row) => !paidSlotIds.has(row.id))
      .map((row) => ({
        alert_type: 'booked_slot_without_paid_booking',
        booking_id: null,
        slot_id: row.id,
        details: {},
      }))

    const stalePendingAlerts: IntegrityAlert[] = stalePending.map((row) => ({
      alert_type: 'pending_booking_stale',
      booking_id: row.id,
      slot_id: row.slot_id,
      details: {
        createdAt: row.created_at,
        thresholdMinutes: PENDING_TIMEOUT_MINUTES,
      },
    }))

    const currentAlerts = [
      ...paidBookingUnbookedSlotAlerts,
      ...bookedSlotWithoutPaidAlerts,
      ...stalePendingAlerts,
    ]

    const unresolvedResult = await supabaseAdmin
      .from('booking_integrity_alerts')
      .select('id, alert_type, booking_id, slot_id')
      .is('resolved_at', null)

    if (unresolvedResult.error) throw unresolvedResult.error

    const keyOf = (alert: { alert_type: string; booking_id: string | null; slot_id: string | null }) =>
      `${alert.alert_type}:${alert.booking_id || ''}:${alert.slot_id || ''}`

    const existingByKey = new Map((unresolvedResult.data || []).map((row) => [keyOf(row), row]))
    const currentByKey = new Map(currentAlerts.map((row) => [keyOf(row), row]))

    const newAlerts = currentAlerts
      .filter((alert) => !existingByKey.has(keyOf(alert)))
      .map((alert) => ({ ...alert, run_id: runId }))

    if (newAlerts.length > 0) {
      const insertAlertsResult = await supabaseAdmin
        .from('booking_integrity_alerts')
        .insert(newAlerts)

      if (insertAlertsResult.error) throw insertAlertsResult.error
    }

    const resolvedAlertIds = (unresolvedResult.data || [])
      .filter((row) => !currentByKey.has(keyOf(row)))
      .map((row) => row.id)

    if (resolvedAlertIds.length > 0) {
      const resolveAlertsResult = await supabaseAdmin
        .from('booking_integrity_alerts')
        .update({ resolved_at: now.toISOString() })
        .in('id', resolvedAlertIds)

      if (resolveAlertsResult.error) throw resolveAlertsResult.error
    }

    const finishRunResult = await supabaseAdmin
      .from('booking_integrity_runs')
      .update({
        stale_pending_count: stalePendingAlerts.length,
        canceled_pending_count: canceledPendingCount,
        released_slot_count: releasedSlotCount,
        paid_unbooked_count: paidBookingUnbookedSlotAlerts.length,
        booked_without_paid_count: bookedSlotWithoutPaidAlerts.length,
        finished_at: now.toISOString(),
      })
      .eq('id', runId)

    if (finishRunResult.error) throw finishRunResult.error

    const alertRecipient = process.env.ALERT_RECIPIENT_EMAIL || process.env.ADMIN_EMAIL || ''

    if (alertRecipient) {
      const nowIso = now.toISOString()

      const failedWebhookThreshold = new Date(
        now.getTime() - WEBHOOK_FAILURE_LOOKBACK_MINUTES * 60 * 1000
      ).toISOString()

      const failedWebhookResult = await supabaseAdmin
        .from('stripe_webhook_events')
        .select('id, event_id, event_type, error_message, processed_at', { count: 'exact' })
        .eq('status', 'failed')
        .gte('processed_at', failedWebhookThreshold)
        .order('processed_at', { ascending: false })
        .limit(5)

      if (failedWebhookResult.error) throw failedWebhookResult.error

      const failedWebhookCount = failedWebhookResult.count || 0
      const failedWebhookSample = failedWebhookResult.data || []

      const staleAlertThreshold = new Date(
        now.getTime() - ALERT_MIN_AGE_MINUTES * 60 * 1000
      ).toISOString()

      const agedUnresolvedAlertsResult = await supabaseAdmin
        .from('booking_integrity_alerts')
        .select('id, alert_type, booking_id, slot_id, detected_at', { count: 'exact' })
        .is('resolved_at', null)
        .lt('detected_at', staleAlertThreshold)
        .order('detected_at', { ascending: true })
        .limit(5)

      if (agedUnresolvedAlertsResult.error) throw agedUnresolvedAlertsResult.error

      const agedAlertCount = agedUnresolvedAlertsResult.count || 0
      const agedAlertSample = agedUnresolvedAlertsResult.data || []

      const alertKinds = [
        {
          alertKind: 'failed_webhook_events',
          isActive: failedWebhookCount > 0,
          details: {
            count: failedWebhookCount,
            lookbackMinutes: WEBHOOK_FAILURE_LOOKBACK_MINUTES,
            sample: failedWebhookSample,
          },
          subject: `[Merlin Ops] ${failedWebhookCount} failed Stripe webhook event(s)`,
          body: `Detected ${failedWebhookCount} failed webhook event(s) in the last ${WEBHOOK_FAILURE_LOOKBACK_MINUTES} minute(s).\n\nSample:\n${JSON.stringify(failedWebhookSample, null, 2)}`,
        },
        {
          alertKind: 'aged_unresolved_integrity_alerts',
          isActive: agedAlertCount > 0,
          details: {
            count: agedAlertCount,
            minAgeMinutes: ALERT_MIN_AGE_MINUTES,
            sample: agedAlertSample,
          },
          subject: `[Merlin Ops] ${agedAlertCount} unresolved booking integrity alert(s)`,
          body: `Detected ${agedAlertCount} unresolved booking integrity alert(s) older than ${ALERT_MIN_AGE_MINUTES} minute(s).\n\nSample:\n${JSON.stringify(agedAlertSample, null, 2)}`,
        },
      ]

      for (const alert of alertKinds) {
        const existingStateResult = await supabaseAdmin
          .from('operational_alert_state')
          .select('alert_kind, is_active, first_detected_at, last_detected_at, last_sent_at')
          .eq('alert_kind', alert.alertKind)
          .maybeSingle()

        if (existingStateResult.error) throw existingStateResult.error

        const existingState = existingStateResult.data

        if (alert.isActive) {
          const shouldSend = shouldSendBasedOnCooldown(existingState?.last_sent_at || null)
          let lastSentAt = existingState?.last_sent_at || null

          if (shouldSend) {
            const sent = await sendOperationalAlertEmail({
              to: alertRecipient,
              subject: alert.subject,
              body: alert.body,
            })

            if (sent) {
              lastSentAt = nowIso
            }
          }

          const upsertResult = await supabaseAdmin
            .from('operational_alert_state')
            .upsert([
              {
                alert_kind: alert.alertKind,
                is_active: true,
                first_detected_at: existingState?.is_active ? existingState.first_detected_at : nowIso,
                last_detected_at: nowIso,
                last_sent_at: lastSentAt,
                resolved_at: null,
                details: alert.details,
                updated_at: nowIso,
              },
            ], { onConflict: 'alert_kind' })

          if (upsertResult.error) throw upsertResult.error
        } else if (existingState?.is_active) {
          const resolveStateResult = await supabaseAdmin
            .from('operational_alert_state')
            .update({
              is_active: false,
              resolved_at: nowIso,
              last_detected_at: nowIso,
              details: alert.details,
              updated_at: nowIso,
            })
            .eq('alert_kind', alert.alertKind)

          if (resolveStateResult.error) throw resolveStateResult.error
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        runId,
        stalePendingCount: stalePendingAlerts.length,
        canceledPendingCount,
        releasedSlotCount,
        paidUnbookedCount: paidBookingUnbookedSlotAlerts.length,
        bookedWithoutPaidCount: bookedSlotWithoutPaidAlerts.length,
        newAlertCount: newAlerts.length,
        resolvedAlertCount: resolvedAlertIds.length,
      }),
    }
  } catch (error: any) {
    await supabaseAdmin
      .from('booking_integrity_runs')
      .update({
        error_message: error?.message || 'Unknown booking monitor error',
        finished_at: now.toISOString(),
      })
      .eq('id', runId)

    return {
      statusCode: 500,
      body: JSON.stringify({
        runId,
        error: error?.message || 'Booking monitor failed',
      }),
    }
  }
}

export { handler }
