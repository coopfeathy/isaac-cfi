# Supabase Authentication Setup

The "Authentication failed" error occurs because Supabase authentication hasn't been configured yet.

## Setup Steps:

### 1. Configure Supabase Dashboard
Go to: https://supabase.com/dashboard/project/fwttykpznnoupoxowvlg

### 2. Enable Email Provider
- Navigate to **Authentication** → **Providers**
- Ensure **Email** provider is enabled
- Toggle "Confirm email" OFF for testing (optional)

### 3. Configure Redirect URLs
- Go to **Authentication** → **URL Configuration**
- Add these URLs to **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - Your production URL when deployed (e.g., `https://yourdomain.com/auth/callback`)

### 4. Run Database Schema
Execute the SQL in `/supabase/schema.sql` in your Supabase SQL editor:
- Go to **SQL Editor** in Supabase dashboard
- Paste the contents of `supabase/schema.sql`
- Run the query

### 5. Test Authentication
- Visit http://localhost:3000/login
- Enter your email address
- Click "Send Magic Link"
- Check your email for the magic link
- Click the link to authenticate

## Troubleshooting

If you still see "Authentication failed":
1. Check browser console for specific error messages
2. Check terminal output for backend errors
3. Verify environment variables in `.env.local` are correct
4. Try using incognito mode to bypass cache
5. Make sure email confirmation is disabled in Supabase for testing

## Current Environment Variables
- ✅ NEXT_PUBLIC_SUPABASE_URL is set
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set
