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
    spreadsheetId: process.env.CTA_EXPERIMENT_GOOGLE_SHEET_ID,
    sheetName: process.env.CTA_EXPERIMENT_GOOGLE_SHEET_TAB || 'CTA Events',
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: getPrivateKey(),
  }
}

function isValidEvent(event: CtaExperimentEvent) {
  return Boolean(event.experimentId && event.variantId && event.variantLabel && event.eventType)
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

  if (!config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    console.info('CTA experiment event received without Google Sheets configuration', event)
    return NextResponse.json({
      logged: false,
      configured: false,
      message: 'CTA event accepted in draft mode. Add Google Sheets env vars to append rows.',
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
    const userAgent = request.headers.get('user-agent') || ''
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
