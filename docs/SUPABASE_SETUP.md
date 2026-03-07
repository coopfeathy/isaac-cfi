# Complete Supabase Setup Guide

## Quick Start (5 minutes)

### Step 1: Run the SQL Setup

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (or create a new one)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the **entire contents** of `supabase/complete-setup.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)

✅ You should see "Success. No rows returned" - this is good!

### Step 2: Configure Authentication

1. Go to **Authentication > Providers**
   - Enable **Email** provider
   - Save changes

2. Go to **Authentication > URL Configuration**
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs** (add both):
     - `http://localhost:3000/auth/callback`
     - `https://isaac-cfi.netlify.app/auth/callback` (for production)
   - Save changes

3. Go to **Authentication > Email Templates**
   - Verify "Magic Link" template is enabled
   - Template should have: `{{ .SiteURL }}/auth/callback`

### Step 3: Create Your Admin Account

1. Navigate to http://localhost:3000/login
2. Enter your email: `Isaac.Imp.Prestwich@gmail.com`
3. Check your email and click the magic link
4. You'll be redirected back to the app

### Step 4: Make Yourself Admin

1. Go to Supabase dashboard > **Table Editor**
2. Select **profiles** table
3. Find your row (your email/user_id)
4. Click the row and set `is_admin` to `true`
5. Save

✅ **You're done!** You now have full admin access.

---

## What Was Created

### Core Tables

1. **profiles** - User profiles with admin flag
2. **slots** - Available flight slots for booking
3. **bookings** - Flight bookings from customers
4. **discovery_flight_signups** - Email leads from funnel
5. **posts** - Blog posts

### CRM Tables

6. **prospects** - Potential clients you've met
7. **students** - Current/past students with training records
8. **communications** - Log of all outreach (email, SMS, calls)
9. **reminders** - Tasks and follow-up reminders

### Features Enabled

- ✅ Row Level Security (RLS) on all tables
- ✅ Admin-only access to sensitive data
- ✅ Public access to public content (blog posts, slots)
- ✅ Automatic timestamp updates
- ✅ Performance indexes on key columns

---

## Dashboard Features

Once logged in as admin at `/dashboard`, you can:

### Manage Slots Tab
- Create new flight slots
- View all available slots
- Edit/delete existing slots

### View Bookings Tab
- See all customer bookings
- View booking status (pending, paid, confirmed, etc.)
- See customer contact info

### Discovery Leads Tab
- View all email signups from discovery flight funnel
- See when each person signed up
- Export for email marketing

### Create Blog Post Tab
- Write and publish blog posts
- Edit existing posts
- Manage blog content

---

## Testing Your Setup

### Test Database Connection
Navigate to: http://localhost:3000/test-supabase

This page will help you:
- Test basic Supabase connectivity
- Test email authentication
- Verify your configuration

### Test Lead Capture
1. Go to: http://localhost:3000/discovery-flight-funnel
2. Enter an email address
3. Submit the form
4. Go to: http://localhost:3000/dashboard
5. Click "Discovery Leads" tab
6. You should see the email you just entered!

---

## Troubleshooting

### "Failed to fetch" Error on Login

**Solution**: Email provider not enabled
- Go to Authentication > Providers
- Enable Email provider

### "No rows returned" When Viewing Leads

**Solution**: You're not admin yet
- Go to Table Editor > profiles
- Set `is_admin = true` for your user

### Can't See Dashboard

**Solution**: Not logged in as admin
1. Make sure you're logged in
2. Check that `is_admin = true` in your profile
3. Your email must match `NEXT_PUBLIC_ADMIN_EMAIL` in `.env.local`

### SQL Errors When Running Setup

**Solution**: Run complete-setup.sql
- Use the new `complete-setup.sql` file
- It has `IF NOT EXISTS` checks to prevent errors
- It drops existing policies before recreating them

---

## Environment Variables Needed

Make sure your `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ADMIN_EMAIL=Isaac.Imp.Prestwich@gmail.com
```

---

## Next Steps

After setup is complete:

1. **Test the login flow**
2. **Create some test data** (slots, prospects, etc.)
3. **Configure Stripe** for payments (see STRIPE_SETUP.md)
4. **Set up Google Calendar** for booking sync (see GOOGLE_CALENDAR_SETUP.md)
5. **Deploy to production** (Netlify)

---

## Production Deployment

When deploying to production:

1. Update Supabase redirect URLs to include production URL
2. Update `.env.local` on Netlify with production values
3. Make sure Site URL in Supabase matches your domain

---

## Netlify Migration (Database + Users)

Important: Netlify hosts your app, but your database and auth users should remain in Supabase. You do not migrate database/auth into Netlify itself.

### 1. Create/prepare target Supabase project

1. Create a new Supabase project for production (if needed)
2. Run SQL in this order:
   - `supabase/complete-setup.sql`
   - `supabase/learn-platform-schema.sql`
3. Confirm tables exist: `profiles`, `courses`, `units`, `lessons`, `videos`, `enrollments`, `progress`

### 2. Migrate database rows

Use Supabase dashboard backups or SQL export/import from source project to target project.

Minimum tables to migrate:
- `profiles`
- `slots`
- `bookings`
- `prospects`
- `students`
- `communications`
- `reminders`
- `courses`
- `units`
- `lessons`
- `videos`
- `enrollments`
- `progress`

### 3. Migrate auth users

Supabase auth users live in `auth.users` and should be migrated between Supabase projects (not Netlify).

Options:
1. Use Supabase project migration tools/backups if available on your plan.
2. If not available, re-invite users by email in the new project.

After migration, ensure each migrated user has a `profiles` row and `is_admin` set correctly.

### 4. Configure Netlify environment variables

In Netlify Dashboard -> Site settings -> Environment variables, set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_NEW_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=https://YOUR_NETLIFY_SITE_URL
NEXT_PUBLIC_ADMIN_EMAIL=Isaac.Imp.Prestwich@gmail.com
RESEND_API_KEY=YOUR_RESEND_KEY
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
GOOGLE_CLIENT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_CALENDAR_ID=...
```

Note: `SUPABASE_SERVICE_ROLE_KEY` is required for secure server-only admin actions like listing users for course enrollment.

### 5. Update Supabase Auth URLs

In target Supabase project:
1. Authentication -> URL Configuration
2. Set Site URL to your Netlify production URL
3. Add Redirect URL:
   - `https://YOUR_NETLIFY_SITE_URL/auth/callback`

### 6. Email setup

Email sending remains via Resend (or another provider). Netlify does not replace your transactional email provider.

### 7. Final verification

1. Deploy on Netlify
2. Sign in with magic link
3. Confirm admin can open `/admin/enrollments`
4. Confirm admin can assign students to courses
5. Confirm students can access `/learn` and watch videos

---

## Need Help?

- Check the test page: http://localhost:3000/test-supabase
- Review Supabase logs: Dashboard > Logs
- Check browser console for errors
- See LOGIN_FIX.md for authentication issues
