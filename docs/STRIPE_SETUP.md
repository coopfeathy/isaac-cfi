# Stripe Setup Guide for Merlin Flight Training

This guide will walk you through setting up Stripe for payment processing on your flight training booking site.

## Table of Contents

1. [Create a Stripe Account](#1-create-a-stripe-account)
2. [Get Your API Keys](#2-get-your-api-keys)
3. [Configure Environment Variables](#3-configure-environment-variables)
4. [Test the Integration](#4-test-the-integration)
5. [Set Up Production](#5-set-up-production)
6. [Configure Webhooks (Optional)](#6-configure-webhooks-optional)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click **"Start now"** or **"Sign up"**
3. Fill in your email, name, and create a password
4. Complete the verification process
5. You'll be taken to your Stripe Dashboard

> **Note:** You can start testing immediately without completing your business details. Stripe allows you to use test mode right away.

---

## 2. Get Your API Keys

### For Testing (Development)

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in the top right should say "Test mode")
3. Click **"Developers"** in the left sidebar
4. Click **"API keys"**
5. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) - Click "Reveal test key"

### Copy These Keys

```
Publishable key: pk_test_51xxxxxxxxxx...
Secret key: sk_test_51xxxxxxxxxx...
```

> **⚠️ IMPORTANT:** Never share your secret key publicly or commit it to GitHub!

---

## 3. Configure Environment Variables

### Local Development (.env.local)

1. Open your `.env.local` file in the project root
2. Update the Stripe configuration:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

**Replace:**
- `sk_test_YOUR_SECRET_KEY_HERE` with your actual secret key
- `pk_test_YOUR_PUBLISHABLE_KEY_HERE` with your actual publishable key
- Leave `STRIPE_WEBHOOK_SECRET` as is for now (we'll set this up later)

### Netlify Production Environment

1. Go to your [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **"Add a variable"** and add each of these:

| Key | Value |
|-----|-------|
| `STRIPE_SECRET_KEY` | `sk_test_YOUR_SECRET_KEY_HERE` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_YOUR_PUBLISHABLE_KEY_HERE` |
| `STRIPE_WEBHOOK_SECRET` | Leave empty for now |

5. Click **"Save"**

> **Note:** Start with test keys. We'll switch to live keys when you're ready to accept real payments.

---

## 4. Test the Integration

### Testing Locally

1. Make sure your environment variables are set in `.env.local`
2. Start your development server:
   ```bash
   npm run dev
   ```
3. Visit [http://localhost:3000/schedule](http://localhost:3000/schedule)
4. Log in (use magic link authentication)
5. Try to book a slot

### Test Credit Card Numbers

Stripe provides test card numbers that work in test mode:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Declined payment |
| `4000 0027 6000 3184` | Requires 3D Secure authentication |

**For all test cards:**
- Use any future expiration date (e.g., `12/34`)
- Use any 3-digit CVC (e.g., `123`)
- Use any ZIP code (e.g., `12345`)

### What Should Happen

1. Click "Book Now" on any available slot
2. A modal should appear with booking details
3. Fill in your name and phone number
4. Enter test card: `4242 4242 4242 4242`
5. Expiry: `12/34`, CVC: `123`, ZIP: `12345`
6. Click "Pay $XXX.XX"
7. Payment should process successfully
8. You should see a success message

### Check in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/payments)
2. Make sure you're in **Test mode**
3. Click **"Payments"** in the left sidebar
4. You should see your test payment listed

---

## 5. Set Up Production

When you're ready to accept real payments:

### Get Live API Keys

1. In your [Stripe Dashboard](https://dashboard.stripe.com)
2. **Toggle to Live mode** (top right corner)
3. Click **"Developers"** → **"API keys"**
4. You'll see:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`)

### Complete Your Stripe Account

Before you can use live mode, you need to:

1. Go to **"Settings"** → **"Account details"**
2. Complete:
   - Business type (Individual or Company)
   - Business details
   - Bank account for payouts
   - Tax information
3. This usually takes 5-10 minutes

### Update Production Environment Variables

**In Netlify:**

1. Go to your [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. **Edit** these variables and replace test keys with live keys:

| Key | Value |
|-----|-------|
| `STRIPE_SECRET_KEY` | `sk_live_YOUR_LIVE_SECRET_KEY` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_YOUR_LIVE_PUBLISHABLE_KEY` |

5. Trigger a new deploy or it will automatically deploy

### Test with Real Card

⚠️ **Warning:** This will charge your actual credit card!

1. Visit your production site: [https://isaac-cfi.netlify.app/schedule](https://isaac-cfi.netlify.app/schedule)
2. Book a slot with a small amount first (test with cheapest slot)
3. Use your real credit card
4. Verify the payment appears in your Stripe Dashboard (Live mode)

### Refund Test Payment

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/payments) (Live mode)
2. Click on the test payment
3. Click **"Refund payment"**
4. Enter amount and confirm

---

## 6. Configure Webhooks (Optional)

Webhooks allow Stripe to notify your site when payments succeed/fail.

### Create a Webhook Endpoint

1. In [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   - For testing: `http://localhost:3000/api/webhooks/stripe`
   - For production: `https://isaac-cfi.netlify.app/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **"Add endpoint"**

### Get Webhook Secret

1. After creating the endpoint, click on it
2. Click **"Reveal"** under **Signing secret**
3. Copy the secret (starts with `whsec_...`)

### Add to Environment Variables

**Locally (.env.local):**
```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

**Netlify:**
1. Go to **Site settings** → **Environment variables**
2. Edit `STRIPE_WEBHOOK_SECRET`
3. Paste your webhook secret

---

## 7. Troubleshooting

### Payment Not Processing

**Issue:** Payment button doesn't work

**Solutions:**
1. Check browser console for errors (F12 → Console tab)
2. Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly
3. Make sure you're using the correct key for test/live mode
4. Clear browser cache and try again

### "No such PaymentIntent" Error

**Issue:** Error when trying to pay

**Solutions:**
1. Check that `STRIPE_SECRET_KEY` is set on your server
2. Verify the API key matches the mode (test vs live)
3. Check server logs in Netlify for detailed error

### Booking Confirmed But No Email

**Issue:** Payment succeeds but no confirmation email

**Solutions:**
1. Check your Supabase email settings
2. Verify SMTP is configured correctly
3. Check spam folder

### Test Card Not Working

**Issue:** Test card `4242 4242 4242 4242` is declined

**Solutions:**
1. Make sure you're in **Test mode** in Stripe Dashboard
2. Verify you're using test API keys (start with `pk_test_` and `sk_test_`)
3. Try a different test card number from the list above

### Live Payments Not Working

**Issue:** Real credit cards are being declined

**Solutions:**
1. Verify you completed Stripe account activation
2. Make sure you're using **live** API keys (start with `pk_live_` and `sk_live_`)
3. Check if your Stripe account is restricted (check Dashboard for notifications)
4. Contact Stripe support if issue persists

---

## Quick Reference

### Test Mode vs Live Mode

| Mode | Publishable Key Prefix | Secret Key Prefix | Real Money? |
|------|----------------------|-------------------|-------------|
| Test | `pk_test_` | `sk_test_` | No ❌ |
| Live | `pk_live_` | `sk_live_` | Yes ✅ |

### Test Card Numbers

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 9995
3D Secure: 4000 0027 6000 3184

Expiry: Any future date (e.g., 12/34)
CVC: Any 3 digits (e.g., 123)
ZIP: Any ZIP code (e.g., 12345)
```

### Support

- **Stripe Documentation:** [https://stripe.com/docs](https://stripe.com/docs)
- **Stripe Support:** [https://support.stripe.com](https://support.stripe.com)
- **Your Site Issues:** Check Netlify deploy logs or contact your developer

---

## Next Steps

1. ✅ Set up test mode and test payments
2. ✅ Complete Stripe business verification
3. ✅ Switch to live API keys
4. ✅ Test with a real card (small amount)
5. ✅ Refund test payment
6. 🚀 Start accepting real bookings!

**Congratulations!** Your payment processing is now set up. Students can book and pay for flight lessons directly on your site.
