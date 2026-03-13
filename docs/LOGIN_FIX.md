# Login Fix - Troubleshooting Guide

## What Was Fixed

1. **Added Better Error Handling**: Enhanced error messages in AuthContext and login page
2. **Added Logging**: Console logs to help debug connection issues  
3. **Improved Supabase Client**: Added auth configuration options
4. **Better UI Feedback**: Clear success/error messages with emojis

## Common Issues & Solutions

### 1. "Failed to fetch" Error

This usually means one of these issues:

#### A. Email Auth Not Enabled in Supabase
**Fix:**
1. Go to [Supabase Dashboard → Authentication → Providers](https://supabase.com/dashboard/project/fwttykpznnoupoxowvlg/auth/providers)
2. Make sure **Email** provider is enabled
3. Check "Enable email confirmations" if you want users to verify their email

#### B. Site URL Not Configured
**Fix:**
1. Go to [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/fwttykpznnoupoxowvlg/auth/url-configuration)
2. Set **Site URL** to: `http://localhost:3000` (for development)
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://isaac-cfi.netlify.app/auth/callback` (for production)
4. Click **Save**

#### C. Email Templates Not Configured
**Fix:**
1. Go to [Supabase Dashboard → Authentication → Email Templates](https://supabase.com/dashboard/project/fwttykpznnoupoxowvlg/auth/templates)
2. Make sure "Magic Link" template is enabled
3. Verify the template has the correct redirect URL: `{{ .SiteURL }}/auth/callback`

### 2. Network/CORS Issues

If you're still getting "Failed to fetch":

**Quick Test:**
Open browser console and run:
```javascript
fetch('https://fwttykpznnoupoxowvlg.supabase.co/auth/v1/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

If this fails, it's a network issue. Check:
- Your internet connection
- Firewall settings
- Browser extensions (try in incognito mode)

### 3. Restart Development Server

After making any changes to environment variables:
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Testing the Login

1. Navigate to `/login`
2. Enter an email address
3. Check the browser console for debug logs
4. Look for these messages:
   - "Attempting sign in for: [email]"
   - "Sign in response: { data, error }"
5. If successful, check your email for the magic link

## Quick Setup Checklist

- [ ] Email provider enabled in Supabase
- [ ] Site URL configured (http://localhost:3000)
- [ ] Redirect URLs added
- [ ] Email templates configured
- [ ] Environment variables in `.env.local` are correct
- [ ] Development server restarted

## Still Having Issues?

Check the browser console for detailed error messages. The enhanced logging will show:
- Supabase URL being used
- Email being sent to
- Redirect URL
- Full error details from Supabase

The logs will help identify exactly where the issue is occurring.
