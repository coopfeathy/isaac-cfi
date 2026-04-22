# Facebook Messenger AI Auto-Responder — Setup Guide

This guide walks you through connecting your Facebook Page to the Merlin Flight Training AI auto-responder so that anyone who messages your page (or clicks a "Send Message" ad) gets an instant, AI-powered reply that guides them toward booking a discovery flight.

---

## What You'll Need

- A **Facebook Page** for Merlin Flight Training
- A **Facebook Developer account** (free): https://developers.facebook.com
- An **Anthropic API key** for Claude: https://console.anthropic.com
- Your site deployed on Netlify (so the webhook URL is publicly reachable)

---

## Step 1: Create a Facebook App

1. Go to https://developers.facebook.com/apps/ and click **Create App**.
2. Select **Business** as the app type.
3. Give it a name like "Merlin Messenger Bot" and associate it with your Business account.
4. Once created, note down the **App ID** and **App Secret** (under Settings → Basic).

## Step 2: Add the Messenger Product

1. In your app's dashboard, click **Add Product** in the left sidebar.
2. Find **Messenger** and click **Set Up**.
3. Under **Access Tokens**, click **Add or Remove Pages** and connect your Merlin Flight Training Facebook Page.
4. Once connected, click **Generate Token** next to your page. This is your **Page Access Token** — copy it.

> **Important:** By default this is a short-lived token. To get a long-lived token, use the [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) and extend it, or use the Graph API token exchange endpoint.

## Step 3: Set Environment Variables

Add these to your `.env.local` file (never commit this file):

```
FB_PAGE_ACCESS_TOKEN=<your-long-lived-page-access-token>
FB_APP_SECRET=<your-app-secret-from-step-1>
FB_VERIFY_TOKEN=<make-up-a-random-string>
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

The `FB_VERIFY_TOKEN` can be any random string you choose — you'll use the same string when configuring the webhook in Step 4.

## Step 4: Configure the Webhook

1. In the Facebook App dashboard, go to **Messenger → Settings**.
2. Under **Webhooks**, click **Add Callback URL**.
3. Enter:
   - **Callback URL:** `https://merlinflighttraining.com/api/facebook-webhook`
   - **Verify Token:** The same `FB_VERIFY_TOKEN` string you set in Step 3.
4. Click **Verify and Save**. Facebook will send a GET request to your webhook — if your site is deployed, it should respond with the challenge and turn green.
5. Under **Webhook Fields**, subscribe to:
   - `messages` — incoming text messages
   - `messaging_postbacks` — "Get Started" button taps and postback buttons

## Step 5: Set Up the "Get Started" Button (Optional but Recommended)

This adds a "Get Started" button that new users see before they can type. When tapped, it sends a postback that kicks off the AI conversation automatically.

Run this curl command (replace `PAGE_ACCESS_TOKEN` with your token):

```bash
curl -X POST "https://graph.facebook.com/v19.0/me/messenger_profile?access_token=PAGE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "get_started": {
      "payload": "GET_STARTED"
    },
    "greeting": [
      {
        "locale": "default",
        "text": "Hi {{user_first_name}}! Welcome to Merlin Flight Training. Tap Get Started to learn about flying!"
      }
    ]
  }'
```

## Step 6: Run the Supabase Migration

Apply the database migration to create the conversation tracking tables:

```bash
# If using Supabase CLI:
supabase db push

# Or run the SQL directly in the Supabase dashboard SQL Editor:
# Copy the contents of supabase/migrations/20260412_messenger_ai.sql
```

## Step 7: Deploy and Test

1. Deploy your updated site to Netlify.
2. Open your Facebook Page and send yourself a message (or use the Page's "Message" button).
3. You should receive an AI-powered response within a few seconds.
4. Check the admin dashboard at `/admin/messenger` to see the conversation logged.

---

## Running Facebook Ads with "Send Message" CTA

To use this with Facebook ads:

1. In **Meta Ads Manager**, create a new campaign.
2. Choose the **Messages** objective (or **Leads** → Messenger).
3. Set the CTA to **Send Message**.
4. When people click the ad, they'll be taken to Messenger where the AI will handle the conversation automatically.

### Tips for Effective Ads

- **Target audience:** People aged 18-55 interested in aviation, pilot training, adventure, bucket list experiences.
- **Ad copy ideas:** "Ever wanted to fly a plane? Book a discovery flight and take the controls!" or "Learn to fly in [your area]. Your first lesson starts at $250."
- **Use video or carousel ads** showing the aircraft, views from the cockpit, happy students.

---

## Architecture Overview

```
Facebook User → Sends Message → Facebook Platform
       ↓
POST /api/facebook-webhook (your Netlify site)
       ↓
messenger-ai.ts → Loads conversation from Supabase
       ↓
Calls Claude API with conversation history + system prompt
       ↓
Sends AI reply back via Facebook Send API
       ↓
Logs everything to Supabase (messenger_conversations + messenger_messages)
       ↓
Admin views at /admin/messenger
```

## Files Reference

| File | Purpose |
|------|---------|
| `lib/facebook-messenger.ts` | Facebook Graph API client (send messages, verify signatures, get profiles) |
| `lib/messenger-ai.ts` | AI conversation engine (Claude-powered, flight school context) |
| `app/api/facebook-webhook/route.ts` | Webhook endpoint (GET verify + POST incoming) |
| `app/api/messenger-manual-reply/route.ts` | Admin manual reply endpoint |
| `app/admin/messenger/page.tsx` | Admin dashboard for viewing conversations |
| `supabase/migrations/20260412_messenger_ai.sql` | Database tables |

## Troubleshooting

**Webhook verification fails:**
- Make sure your site is deployed and the `/api/facebook-webhook` route is accessible.
- Double-check that `FB_VERIFY_TOKEN` matches exactly between your `.env.local` and the Facebook App settings.

**Messages not being received:**
- Confirm you subscribed to `messages` and `messaging_postbacks` webhook fields.
- Check the Netlify function logs for errors.
- Make sure `FB_PAGE_ACCESS_TOKEN` is valid and not expired.

**AI not responding:**
- Check that `ANTHROPIC_API_KEY` is set and valid.
- Look at the Netlify function logs for Claude API errors.
- The fallback message ("Thanks for your message! I'm having a brief technical hiccup...") will be sent if Claude is unreachable.

**Rate limits:**
- Facebook allows ~200 messages/second per page. For a flight school this will never be an issue.
- Claude API has its own rate limits — the current setup uses `claude-sonnet-4-20250514` which is cost-effective for short conversational replies.
