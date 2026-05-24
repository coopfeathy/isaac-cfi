import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

type CtaExperimentEvent = {
  experimentId?: string
  variantId?: string
  variantLabel?: string
  eventType?: string
  visitorId?: string
  sessionId?: string
  pagePath?: string
  referrer?: string
  device?: string
  metadata?: Record<string, unknown>
}

function getPrivateKey() {
  return process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
}

function getSheetConfig() {
  return {
    webhookUrl: process.env.CTA_EXPERIMENT_WEBHOOK_URL,
    webhookSecret: process.env.CTA_EXPERIMENT_WEBHOOK_SECRET,
    spreadsheetId: process.env.CTA_EXPERIMENT_GOOGLE_SHEET_ID,
    sheetName: process.env.CTA_EXPERIMENT_GOOGLE_SHEET_TAB || 'CTA Events',
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: getPrivateKey(),
  }
}

function isValidEvent(event: CtaExperimentEvent) {
  return Boolean(event.experimentId && event.variantId && event.variantLabel && event.eventType)
}

async function appendEventViaWebhook(
  webhookUrl: string,
  webhookSecret: string | undefined,
  event: CtaExperimentEvent,
  userAgent: string
) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: webhookSecret,
      timestamp: new Date().toISOString(),
      userAgent,
      ...event,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`CTA experiment webhook failed: ${response.status} ${errorText}`)
  }
}

export async function POST(request: NextRequest) {
  const event = await request.json().catch(() => null) as CtaExperimentEvent | null

  if (!event || !isValidEvent(event)) {
    return NextResponse.json(
      { error: 'Invalid CTA experiment event' },
      { status: 400 }
    )
  }

  const config = getSheetConfig()
  const userAgent = request.headers.get('user-agent') || ''

  if (config.webhookUrl) {
    try {
      await appendEventViaWebhook(config.webhookUrl, config.webhookSecret, event, userAgent)
      return NextResponse.json({ logged: true, configured: true, method: 'webhook' })
    } catch (error) {
      console.error('Failed to append CTA experiment event via webhook', error)
      return NextResponse.json(
        { error: 'Failed to append CTA experiment event' },
        { status: 502 }
      )
    }
  }

  if (!config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    console.info('CTA experiment event received without Google Sheets configuration', event)
    return NextResponse.json({
      logged: false,
      configured: false,
      message: 'CTA event accepted in draft mode. Add CTA_EXPERIMENT_WEBHOOK_URL or Google Sheets env vars to append rows.',
    })
  }

  try {
    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const sheets = google.sheets({ version: 'v4', auth })
    const timestamp = new Date().toISOString()
    const metadataJson = event.metadata ? JSON.stringify(event.metadata) : ''

    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A:L`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          timestamp,
          event.experimentId,
          event.variantId,
          event.variantLabel,
          event.eventType,
          event.visitorId || '',
          event.sessionId || '',
          event.pagePath || '',
          event.referrer || '',
          event.device || '',
          userAgent,
          metadataJson,
        ]],
      },
    })

    return NextResponse.json({ logged: true, configured: true })
  } catch (error) {
    console.error('Failed to append CTA experiment event to Google Sheets', error)
    return NextResponse.json(
      { error: 'Failed to append CTA experiment event' },
      { status: 502 }
    )
  }
}
