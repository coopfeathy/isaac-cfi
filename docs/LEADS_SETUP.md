# Discovery Flight Leads Setup

This setup allows you to capture and view email addresses from users who sign up through the discovery flight funnel.

## What Was Added

1. **Database Table**: A new `discovery_flight_signups` table to store email leads
2. **API Endpoint**: Already exists at `/api/discovery-flight-signup/route.ts` - saves emails to the database
3. **Admin Dashboard**: New "Discovery Leads" tab displays all captured emails with timestamps

## Setup Instructions

### 1. Create the Database Table

Run the SQL script in your Supabase SQL Editor:

```bash
# The SQL file is located at:
supabase/discovery-flight-signups.sql
```

**To run it:**
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Copy and paste the contents of `supabase/discovery-flight-signups.sql`
4. Click "Run" to execute the script

### 2. View the Leads

Once the table is created:

1. Navigate to `/dashboard` (admin only)
2. Click the "Discovery Leads" tab
3. You'll see a table with:
   - Email addresses
   - Submission timestamps

## How It Works

1. **User Journey**:
   - User visits `/discovery-flight-funnel`
   - Enters their email address
   - Email is saved to `discovery_flight_signups` table
   - User proceeds to `/discovery-flight-pt1`

2. **Admin View**:
   - Admins can view all leads in the dashboard
   - Sorted by most recent first
   - Clean table view with email and timestamp

## Files Modified

- `app/dashboard/page.tsx` - Added Leads tab with table view
- `app/api/discovery-flight-signup/route.ts` - Already existed, saves emails
- `app/discovery-flight-funnel/page.tsx` - Already calls the API
- `supabase/discovery-flight-signups.sql` - New database schema

## Security

- Only admins can view leads (RLS policy)
- Anyone can insert signups (needed for public form)
- Emails are stored securely in Supabase

## Next Steps (Optional Enhancements)

- Add export to CSV functionality
- Add email filtering/search
- Add lead status tracking (contacted, converted, etc.)
- Add integration with email marketing service
- Add duplicate email detection
