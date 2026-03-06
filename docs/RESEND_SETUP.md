# Resend Email Setup Guide

## Overview
Resend is integrated into your application for sending transactional emails and email broadcast campaigns from the admin dashboard.

## Step 1: Get Your Resend API Key

1. Go to [resend.com](https://resend.com) and sign up or log in
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**
4. Give it a name (e.g., "Merlin Flight Training Production")
5. Copy the API key (it starts with `re_`)

## Step 2: Add API Key to Environment Variables

Add your Resend API key to `.env.local`:

```bash
RESEND_API_KEY=re_your_actual_api_key_here
```

**Important:** Also add this to your Netlify environment variables:
1. Go to Netlify Dashboard → Site settings → Environment variables
2. Add new variable:
   - Key: `RESEND_API_KEY`
   - Value: Your Resend API key

## Step 3: Verify Domain (Optional but Recommended)

For production use, verify your domain in Resend:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `isaac-cfi.netlify.app`)
4. Add the DNS records provided by Resend to your DNS provider
5. Wait for verification (usually takes a few minutes)

Once verified, update the "from" address in `/app/api/send-email/route.ts`:
```typescript
from: 'Merlin Flight Training <hello@yourdomain.com>',
```

## Features Included

### 1. Email Broadcasting (Admin Dashboard)
- Navigate to Admin Dashboard → **Email Campaigns** tab
- Select recipient groups:
  - All Users
  - Students Only
  - Prospects Only
  - Discovery Flight Leads
  - Custom email list
- Compose and send mass emails

### 2. Email Templates
Pre-built templates in `/lib/resend.ts`:
- **Welcome Email** - Sent to new students
- **Flight Reminder** - Reminder for upcoming flights
- **Broadcast** - Generic template for campaigns

### 3. API Endpoint
`POST /api/send-email` - Handles all email sending
- Requires admin authentication
- Supports multiple email types
- Returns success/error status

## Usage Examples

### Send Welcome Email (Programmatically)
```typescript
const response = await fetch('/api/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    type: 'welcome',
    recipients: 'student@example.com',
    name: 'John Doe'
  })
})
```

### Send Flight Reminder
```typescript
await fetch('/api/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    type: 'flight_reminder',
    recipients: 'student@example.com',
    name: 'John Doe',
    date: 'March 15, 2026',
    time: '10:00 AM'
  })
})
```

### Broadcast Campaign (Via Admin Dashboard)
1. Go to Admin Dashboard → Email Campaigns
2. Select recipient type
3. Click "Load Recipients"
4. Enter subject and message
5. Preview the email
6. Click "Send to X Recipient(s)"

## Rate Limits

Resend free tier:
- 100 emails/day
- 3,000 emails/month

Paid plans offer higher limits. Check [resend.com/pricing](https://resend.com/pricing)

## Troubleshooting

### "RESEND_API_KEY environment variable is not set"
- Make sure you added the key to `.env.local`
- Restart your development server: `npm run dev`
- For production, verify the key is in Netlify environment variables

### "Failed to send email"
- Check API key is valid
- Verify you haven't exceeded rate limits
- Check Resend dashboard for error logs

### Emails going to spam
- Verify your domain in Resend
- Set up SPF, DKIM, and DMARC records
- Use a professional "from" address (not noreply@)
- Avoid spam trigger words in subject/content

## Security Notes

- ✅ Email endpoint requires admin authentication
- ✅ User tokens are validated via Supabase
- ✅ API key is server-side only (not exposed to client)
- ✅ Rate limiting handled by Resend

## Next Steps

1. Get your Resend API key and add to environment variables
2. Test sending an email from the admin dashboard
3. (Optional) Verify your domain for production use
4. Customize email templates in `/lib/resend.ts`
5. Set up automated emails (welcome emails, reminders, etc.)

## Support

- Resend Documentation: [resend.com/docs](https://resend.com/docs)
- Resend Status: [status.resend.com](https://status.resend.com)
