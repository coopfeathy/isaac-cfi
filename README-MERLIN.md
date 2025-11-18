# Merlin Flight Training

A full-featured flight school and tour booking platform built with Next.js, Supabase, Stripe, and Netlify.

## Features

- 🔐 **Authentication** - Magic link email authentication via Supabase
- 📅 **Booking System** - Real-time slot availability and booking management
- 💳 **Payments** - Secure payment processing with Stripe Checkout
- 👨‍✈️ **Admin Dashboard** - Create/manage slots and view all bookings
- 📝 **Blog** - Netlify CMS for easy content management
- 🎨 **Modern UI** - Responsive design with Tailwind CSS and custom branding
- ⚡ **Serverless Functions** - Netlify Functions for backend operations

## Tech Stack

- **Frontend**: Next.js 13 (React), TypeScript, Tailwind CSS
- **Backend**: Netlify Functions (serverless)
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe (Checkout Sessions + Webhooks)
- **Hosting**: Netlify
- **CMS**: Netlify CMS (Git-based)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Accounts for:
  - [Supabase](https://supabase.com) (free tier)
  - [Stripe](https://stripe.com) (free tier)
  - [Netlify](https://netlify.com) (free tier)
  - GitHub account

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/merlin-flight-training.git
cd merlin-flight-training
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API to find your credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

3. Run the SQL schema in Supabase SQL Editor:
   ```bash
   # Copy content from supabase/schema.sql and run in Supabase SQL Editor
   ```

4. (Optional) Seed sample data:
   ```bash
   # Copy content from supabase/seed.sql and run in Supabase SQL Editor
   ```

5. Set admin privileges for your account:
   ```sql
   -- After creating your account via the app, run this:
   update profiles set is_admin = true 
   where id = (select id from auth.users where email = 'your-email@example.com');
   ```

### 3. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from Dashboard → Developers → API keys:
   - `STRIPE_SECRET_KEY` (use test key for development)

3. Set up webhook endpoint:
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-site.netlify.app/.netlify/functions/stripe-webhook`
   - Select events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
   - Copy the `STRIPE_WEBHOOK_SECRET`

### 4. Environment Variables

Create `.env.local` for local development:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Local Development

```bash
# Start Next.js dev server
npm run dev

# For testing Netlify Functions locally (in another terminal):
netlify dev
```

Visit `http://localhost:3000`

### 6. Deploy to Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and click "New site from Git"
3. Connect your GitHub repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - (Netlify auto-detects Next.js projects)

5. Add environment variables in Netlify:
   - Go to Site settings → Environment variables
   - Add all the variables from `.env.local`
   - Update `NEXT_PUBLIC_SITE_URL` to your Netlify URL

6. Deploy!

### 7. Netlify CMS Setup

1. Enable Netlify Identity:
   - Go to Site settings → Identity
   - Click "Enable Identity"

2. Enable Git Gateway:
   - In Identity settings, scroll to Services
   - Enable Git Gateway

3. Invite yourself as admin:
   - Go to Identity tab
   - Click "Invite users"
   - Enter your email

4. Access CMS:
   - Visit `https://your-site.netlify.app/admin`
   - Accept the invitation email
   - Set a password
   - Start creating blog posts!

Alternatively, you can use GitHub authentication by updating `public/admin/config.yml`:
```yaml
backend:
  name: github
  repo: your-username/your-repo
  branch: main
```

## Project Structure

```
├── app/
│   ├── admin/              # Admin dashboard
│   ├── auth/               # Auth callback handler
│   ├── blog/               # Blog pages
│   ├── booking/            # Booking success page
│   ├── bookings/           # User bookings list
│   ├── components/         # Reusable components
│   ├── contexts/           # React contexts (Auth)
│   ├── faq/                # FAQ page
│   ├── login/              # Login page
│   ├── schedule/           # Browse and book slots
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Homepage
├── content/
│   └── posts/              # Blog posts (markdown)
├── lib/
│   ├── posts.ts            # Blog post utilities
│   ├── supabase.ts         # Supabase client & types
│   └── utils.ts            # Utility functions
├── netlify/
│   └── functions/          # Serverless functions
│       ├── book.ts         # Free booking handler
│       ├── create-checkout.ts  # Stripe checkout
│       └── stripe-webhook.ts   # Stripe webhook handler
├── public/
│   └── admin/              # Netlify CMS config
├── supabase/
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Sample data
└── package.json
```

## Usage Guide

### For Customers

1. **Sign Up/Sign In**: Click "Sign In" and enter your email to receive a magic link
2. **Browse Slots**: Go to "Schedule" to see available flight times
3. **Book a Flight**: Select a slot and complete payment via Stripe
4. **View Bookings**: Check "My Bookings" to see all your reservations

### For Admin (Owner)

1. **Create Slots**: Go to Admin → Manage Slots → Add New Slot
2. **Manage Bookings**: View all bookings and update their status
3. **Write Blog Posts**: Visit `/admin` to access Netlify CMS
4. **Monitor Payments**: Check Stripe dashboard for payment details

## Key Features Explained

### Authentication Flow
- Users enter email → receive magic link → auto-signed in
- Profile created automatically on first sign-in
- Session persists across visits

### Booking Flow
1. User selects slot from schedule page
2. For paid slots: Redirected to Stripe Checkout
3. On successful payment: Webhook updates database
4. Slot marked as booked, user receives confirmation

### Payment Processing
- Stripe Checkout handles all payment UI
- Webhook verifies payments server-side
- Secure: No card details touch your servers
- Supports refunds via Stripe dashboard

### Admin Capabilities
- Create/delete flight slots
- View all bookings with customer info
- Update booking status
- Export data (can add CSV export easily)

## Customization

### Branding Colors
Edit `tailwind.config.ts`:
```typescript
colors: {
  golden: "#C59A2A",  // Accent color
  darkText: "#0B0B0B", // Primary text
}
```

### Email Templates
Supabase Auth emails can be customized in:
Supabase Dashboard → Authentication → Email Templates

### Slot Pricing
Prices are stored in cents in the database:
- $99.00 = 9900 cents
- $149.00 = 14900 cents

## Testing

### Test Payments (Development)
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Any future expiry date, any CVC

### Test Webhooks Locally
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook

# Use the webhook signing secret shown in terminal
```

## Troubleshooting

### Database Connection Issues
- Verify Supabase URL and keys in environment variables
- Check if database schema has been run
- Ensure Row Level Security policies are set up

### Stripe Webhook Not Working
- Verify webhook secret matches Stripe dashboard
- Check webhook URL is correct: `https://site/.netlify/functions/stripe-webhook`
- View webhook logs in Stripe dashboard

### Authentication Failing
- Check Supabase email templates are enabled
- Verify site URL in Supabase settings matches your domain
- Check email spam folder for magic links

### Netlify Function Errors
- Check function logs in Netlify dashboard
- Ensure all environment variables are set
- Verify function timeout settings (default: 10s)

## Deployment Checklist

- [ ] Supabase project created
- [ ] Database schema run
- [ ] Admin account set up
- [ ] Stripe account configured
- [ ] Webhook endpoint created
- [ ] Environment variables set in Netlify
- [ ] Site deployed successfully
- [ ] Netlify Identity enabled (for CMS)
- [ ] Test booking flow end-to-end
- [ ] Test admin functions
- [ ] Custom domain configured (optional)

## Security Notes

- Never commit `.env.local` to git
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only
- Use Stripe test keys during development
- Enable HTTPS (automatic with Netlify)
- Review Supabase RLS policies

## Support

For issues or questions:
- Check the [Next.js docs](https://nextjs.org/docs)
- Review [Supabase documentation](https://supabase.com/docs)
- Consult [Stripe docs](https://stripe.com/docs)

## License

MIT
