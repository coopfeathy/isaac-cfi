# CTA Experiment Apps Script Webhook

Use this in the Google Sheet so Netlify only needs a short webhook URL and secret.

1. Open the CTA experiment Google Sheet.
2. Go to Extensions > Apps Script.
3. Paste this script.
4. Set `SECRET` to the same value as `CTA_EXPERIMENT_WEBHOOK_SECRET` in Netlify.
5. Deploy > New deployment > Web app.
6. Set "Execute as" to "Me".
7. Set access to "Anyone".
8. Copy the web app URL into Netlify as `CTA_EXPERIMENT_WEBHOOK_URL`.

```js
const SHEET_NAME = 'CTA Events'
const SECRET = 'replace-this-with-a-long-random-secret'

function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}')

  if (SECRET && body.secret !== SECRET) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Missing CTA Events sheet' }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  sheet.appendRow([
    body.timestamp || new Date().toISOString(),
    body.experimentId || '',
    body.variantId || '',
    body.variantLabel || '',
    body.eventType || '',
    body.visitorId || '',
    body.sessionId || '',
    body.pagePath || '',
    body.referrer || '',
    body.device || '',
    body.userAgent || '',
    body.metadata ? JSON.stringify(body.metadata) : '',
  ])

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON)
}
```
