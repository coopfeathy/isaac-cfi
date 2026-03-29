type SendTwilioMessageParams = {
  to: string
  body: string
  mediaUrls?: string[]
}

const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '')

export async function sendTwilioMessage(params: SendTwilioMessageParams) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!sid || !token || !from) {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.')
  }

  const payload = new URLSearchParams({
    From: normalizePhone(from),
    To: normalizePhone(params.to),
    Body: params.body,
  })

  const mediaUrls = (params.mediaUrls || []).filter(Boolean)
  mediaUrls.slice(0, 5).forEach((mediaUrl) => {
    payload.append('MediaUrl', mediaUrl)
  })

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Unable to send text message: ${details}`)
  }

  return response.json()
}
