# Merlin Flight Training - Quick Setup Guide

Follow these steps to get your flight school booking system up and running.

## 🚀 Quick Start (15 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Name it "Merlin Flight Training"
4. Set a strong database password
5. Choose a region close to your users
6. Wait 2 minutes for setup to complete

### Step 3: Get Supabase Credentials

1. In your project, click "Settings" (gear icon) → "API"
2. Copy these 3 values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (click "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Setup Database

1. Click "SQL Editor" in left sidebar
2. Click "New Query"
3. Copy all contents of `supabase/schema.sql`
4. Paste and click "Run"
5. Wait for "Success" message

6. Create another new query
7. Copy all contents of `supabase/seed.sql`
8. Paste and click "Run"

### Step 5: Get Stripe Credentials

1. Go to [stripe.com](https://stripe.com) and create account
2. Skip onboarding for now (use test mode)
3. Go to Developers → API keys
4. Copy **Secret key** → `STRIPE_SECRET_KEY`
5. Leave webhook setup for later (after deployment)

### Step 6: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in all values from steps 3 & 5

### Step 7: Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Step 8: Create Admin Account

1. Click "Sign In" on your local site
2. Enter your email
3. Check email for magic link
4. Click the link to sign in

5. Go back to Supabase → SQL Editor
6. Run this query (replace with your email):
   ```sql
   update profiles set is_admin = true 
   where id = (
     select id from auth.users 
     where email = 'your-email@example.com'
   );
   ```

7. Refresh your site - you should now see "Admin" in navigation

### Step 9: Test Booking Flow

1. Go to Admin → Add New Slot
2. Create a test slot for tomorrow
3. Sign out and create a new account with different email
4. Try to book the slot (use test card: `4242 4242 4242 4242`)

## 🌐 Deploy to Netlify (10 minutes)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/merlin-flight.git
git push -u origin main
```

### Step 2: Connect to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub and select your repository
4. Build settings (auto-detected):
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Click "Deploy"

### Step 3: Add Environment Variables to Netlify

1. Go to Site settings → Environment variables
2. Click "Add a variable"
3. Add all 6 variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (leave empty for now)
   - `NEXT_PUBLIC_SITE_URL` (use your Netlify URL: `https://yoursite.netlify.app`)

4. Click "Deploy site" → "Trigger deploy"

### Step 4: Setup Stripe Webhook

1. Copy your Netlify site URL (e.g., `https://merlin-flight.netlify.app`)
2. Go to Stripe → Developers → Webhooks
3. Click "Add endpoint"
4. Endpoint URL: `https://yoursite.netlify.app/.netlify/functions/stripe-webhook`
5. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
6. Click "Add endpoint"
7. Click on the webhook you just created
8. Click "Reveal" next to "Signing secret"
9. Copy the secret (starts with `whsec_`)

10. Go back to Netlify → Environment variables
11. Update `STRIPE_WEBHOOK_SECRET` with the value you copied
12. Trigger a new deploy

### Step 5: Update Supabase Site URL

1. Go to Supabase → Authentication → URL Configuration
2. Add your Netlify URL to "Site URL"
3. Add your Netlify URL to "Redirect URLs"

### Step 6: Setup Netlify CMS (Optional)

1. In Netlify, go to Site settings → Identity
2. Click "Enable Identity"
3. Scroll down to "Git Gateway" and enable it
4. Go to Identity tab
5. Click "Invite users"
6. Enter your email
7. Check email and accept invitation
8. Visit `https://yoursite.netlify.app/admin`
9. Set password and start blogging!

## ✅ Post-Deployment Checklist

- [ ] Site loads at your Netlify URL
- [ ] Can sign in with magic link
- [ ] Admin panel accessible
- [ ] Can create slots as admin
- [ ] Can book slot (test payment works)
- [ ] Webhook receives payment confirmations
- [ ] Blog posts visible at /blog
- [ ] Netlify CMS accessible at /admin

## 🎨 Customization

### Update Branding
1. Replace company name in `app/layout.tsx`
2. Update colors in `tailwind.config.ts`
3. Add your logo to `public/` folder

### Update Netlify CMS Repo
1. Edit `public/admin/config.yml`
2. Change `repo:` to your GitHub username/repo

### Add Custom Domain
1. In Netlify: Site settings → Domain management
2. Click "Add custom domain"
3. Follow DNS setup instructions

## 🆘 Common Issues

### "Invalid API credentials"
→ Check your `.env.local` has correct Supabase keys

### "Webhook signature verification failed"
→ Make sure `STRIPE_WEBHOOK_SECRET` in Netlify matches Stripe dashboard

### "Auth callback failed"
→ Add your site URL to Supabase → Authentication → URL Configuration

### Can't access admin panel
→ Run the SQL command to set `is_admin = true` for your user

### Payments not updating database
→ Check Netlify function logs and Stripe webhook logs

## 📚 Next Steps

- Read full [README-MERLIN.md](./README-MERLIN.md) for detailed documentation
- Customize email templates in Supabase
- Add your flight school details
- Create more slot types
- Write blog posts about your services
- Add photos to homepage

## 💡 Tips

- Use test mode in Stripe until you're ready to accept real payments
- Test booking flow thoroughly before going live
- Set up email notifications for new bookings
- Export booking data regularly
- Monitor Stripe dashboard for payment issues

---

**Need help?** Check the troubleshooting section in README-MERLIN.md
