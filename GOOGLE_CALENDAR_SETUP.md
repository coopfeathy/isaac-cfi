# Google Calendar API Setup Guide

This guide will help you set up Google Calendar integration so that confirmed bookings automatically create calendar events.

## What This Does

When a customer successfully pays for a booking:
1. The booking is saved to your database
2. **A calendar event is automatically created in your Google Calendar**
3. The customer receives a calendar invitation via email
4. You get reminders 1 day and 1 hour before the flight

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** at the top → **"New Project"**
3. Name it **"Merlin Flight Training"** (or similar)
4. Click **"Create"**
5. Wait for the project to be created (takes ~30 seconds)

---

## Step 2: Enable Google Calendar API

1. In your new project, click the **☰ menu** → **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on it, then click **"Enable"**
4. Wait for it to enable

---

## Step 3: Create a Service Account

1. Click **☰ menu** → **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"Service Account"**
3. Fill in:
   - **Service account name**: `flight-booking-calendar`
   - **Service account ID**: (auto-generated, leave it)
   - **Description**: `Automatically creates calendar events for flight bookings`
4. Click **"Create and Continue"**
5. **Skip** the optional steps (click "Continue" then "Done")

---

## Step 4: Create a Key for the Service Account

1. On the **Credentials** page, find your new service account in the list
2. Click on the service account email (looks like `flight-booking-calendar@...`)
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Choose **JSON** format
6. Click **"Create"**
7. A JSON file will download - **KEEP THIS SAFE!**

---

## Step 5: Share Your Google Calendar

1. Open [Google Calendar](https://calendar.google.com/)
2. Find the calendar you want to use (usually your main calendar)
3. Click the **⋮** (three dots) next to the calendar name
4. Click **"Settings and sharing"**
5. Scroll down to **"Share with specific people or groups"**
6. Click **"+ Add people and groups"**
7. **Paste the service account email** from the JSON file (it's the `client_email` field)
   - Example: `flight-booking-calendar@merlin-flight-training.iam.gserviceaccount.com`
8. Set permissions to **"Make changes to events"**
9. Click **"Send"**

---

## Step 6: Get Your Calendar ID (Optional)

By default, events will be created in your **primary calendar**. If you want to use a specific calendar:

1. In Google Calendar settings, find your calendar
2. Scroll to **"Integrate calendar"**
3. Copy the **"Calendar ID"** (looks like an email address or just says "primary")

---

## Step 7: Add Credentials to Your Environment Variables

1. Open the JSON file you downloaded in Step 4
2. Find these two fields:
   ```json
   {
     "client_email": "flight-booking-calendar@merlin-flight-training.iam.gserviceaccount.com",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
   }
   ```

3. Copy them to your `.env.local` file:
   ```env
   GOOGLE_CLIENT_EMAIL=flight-booking-calendar@merlin-flight-training.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
   GOOGLE_CALENDAR_ID=primary
   ```

   **Important**: Keep the `\n` characters in the private key - they're needed!

4. Also add these to **Netlify Environment Variables**:
   - Go to Netlify dashboard → Your site → Site settings → Environment variables
   - Add all three variables (copy from `.env.local`)

---

## Step 8: Test It!

1. After adding the environment variables to Netlify, redeploy your site
2. Make a test booking on your site
3. Check your Google Calendar - you should see a new event!
4. The customer should receive a calendar invitation email

---

## Troubleshooting

### Events not appearing in calendar
- Check that you shared the calendar with the service account email
- Verify the service account email matches exactly
- Make sure the private key has all the `\n` characters

### "Permission denied" errors
- The service account needs "Make changes to events" permission
- Try removing and re-adding the service account to calendar sharing

### Customer not receiving invitations
- Make sure `sendUpdates: 'all'` is set in the code (it is by default)
- Check the customer's spam folder
- Verify the customer's email is correct in their profile

---

## What Gets Created

Each calendar event includes:
- **Title**: "Flight Training - [Customer Name]" or "Flight Tour - [Customer Name]"
- **Description**: 
  - Customer name, email, phone
  - Booking notes
  - Slot description
- **Time**: Exact start/end time from the booking slot
- **Attendees**: Customer email (they get an invitation)
- **Reminders**: Email 1 day before and 1 hour before

---

## Security Notes

- **Never commit the JSON key file** to git (it's in `.gitignore`)
- The private key in `.env.local` is sensitive - keep it secret
- Only share your calendar with this specific service account
- You can revoke access anytime from Google Calendar settings

---

## Optional: Use a Dedicated Flight Calendar

Instead of your main calendar, you can create a separate "Flight Bookings" calendar:

1. In Google Calendar, click **"+"** next to "Other calendars"
2. Create new calendar called **"Flight Bookings"**
3. Share it with the service account
4. Get its Calendar ID from settings
5. Update `GOOGLE_CALENDAR_ID` in your environment variables

This keeps your flight bookings organized separately!
