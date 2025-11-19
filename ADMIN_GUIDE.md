# Admin Dashboard Guide

Complete guide for managing your flight training booking site as an administrator.

## Table of Contents

1. [Accessing the Admin Dashboard](#accessing-the-admin-dashboard)
2. [Managing Availability](#managing-availability)
3. [Viewing Bookings](#viewing-bookings)
4. [Creating Blog Posts](#creating-blog-posts)
5. [Authentication System](#authentication-system)
6. [Tips & Best Practices](#tips--best-practices)

---

## Accessing the Admin Dashboard

### Login as Admin

1. Visit [https://isaac-cfi.netlify.app/login](https://isaac-cfi.netlify.app/login)
2. Enter your admin email: `Isaac.Imp.Prestwich@gmail.com`
3. Check your email for the magic link
4. Click the link to sign in
5. Once logged in, click **"Admin"** in the navigation bar (golden color)

> **Note:** Only the email address configured in `ADMIN_EMAIL` environment variable can access the admin dashboard. Anyone else will be redirected to the homepage.

### Admin Features

As an admin, you have access to:
- ✅ Manage flight slots and availability
- ✅ View all bookings and customer details
- ✅ Update booking statuses
- ✅ Create and publish blog posts
- ✅ Delete slots
- ✅ Access "My Bookings" (your personal bookings)

---

## Managing Availability

### Creating New Flight Slots

1. Go to the **Admin Dashboard** → **Manage Slots** tab
2. Click **"Add New Slot"**
3. Fill in the form:

#### Slot Details

| Field | Description | Example |
|-------|-------------|---------|
| **Start Time** | When the slot begins | `2025-11-20 10:00 AM` |
| **End Time** | When the slot ends | `2025-11-20 12:00 PM` |
| **Type** | Training or NYC Tour | `Flight Training` |
| **Price (cents)** | Amount in cents | `15000` ($150.00) |
| **Description** | Optional details | `Discovery Flight` |

4. Click **"Create Slot"**

> **💡 Tip:** Price is in cents! For $150.00, enter `15000`. For $99.00, enter `9900`.

### Understanding Slot Types

**Flight Training:**
- One-on-one instruction
- Used for lessons, discovery flights, checkrides
- Shows up with green badge on schedule page

**NYC Tour:**
- Sightseeing flights over New York City
- Shows up with blue badge on schedule page
- Can be booked by anyone

### Deleting Slots

1. Find the slot in the **Manage Slots** tab
2. Click **"Delete"** below the slot
3. Confirm deletion
4. Slot is permanently removed

> ⚠️ **Warning:** Cannot delete a slot that's already booked. Must cancel the booking first.

### Best Practices for Availability

- **Plan ahead:** Add slots at least 1 week in advance
- **Buffer time:** Leave 30 minutes between slots for prep
- **Weather:** Check forecasts before adding slots
- **Maintenance:** Don't add slots during scheduled aircraft maintenance
- **Personal time:** Block out days you're unavailable

---

## Viewing Bookings

### Bookings Tab

1. Go to **Admin Dashboard** → **View Bookings** tab
2. See all bookings sorted by most recent first

### Booking Information

Each booking card shows:
- Customer name (from their profile)
- Customer phone number
- Booking type (Training or Tour)
- Date and time
- Price paid
- Current status
- Customer notes
- Booking date/time

### Booking Statuses

| Status | Meaning | What to Do |
|--------|---------|-----------|
| **Pending** | Payment initiated but not confirmed | Wait for payment confirmation |
| **Paid** | Payment received | Confirm the booking |
| **Confirmed** | Booking is confirmed | Prepare for the flight |
| **Completed** | Flight has occurred | Mark as complete after flight |
| **Canceled** | Booking was canceled | Issue refund if needed |

### Updating Booking Status

1. Find the booking in the list
2. Click the **status dropdown** (top right of booking card)
3. Select new status
4. Status updates immediately

### Common Workflow

```
Pending → Paid → Confirmed → Completed
```

Or for cancellations:
```
Any Status → Canceled
```

---

## Creating Blog Posts

### Writing a New Post

1. Go to **Admin Dashboard** → **Create Blog Post** tab
2. Fill in the form:

#### Blog Post Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Title** | Post headline | `5 Tips for Your First Solo Flight` |
| **Author** | Your name/credentials | `Isaac Prestwich, CFII` |
| **Excerpt** | Brief summary (2-3 sentences) | `Preparing for your first solo flight can be nerve-wracking...` |
| **Content** | Full blog post | Use Markdown formatting |

3. Click **"Create Blog Post"**
4. Post is immediately published to [https://isaac-cfi.netlify.app/blog](https://isaac-cfi.netlify.app/blog)

### Markdown Formatting Guide

```markdown
# Large Heading
## Medium Heading
### Small Heading

**Bold text**
*Italic text*

- Bullet point
- Another bullet point

1. Numbered list
2. Another item

[Link text](https://example.com)

> Quote or callout
```

### Blog Post Ideas

- Pre-flight checklist tips
- Weather decision-making
- Aircraft systems explained
- Student success stories
- Aviation safety topics
- Local flying destinations
- FAQ answers in detail
- Training milestone guides

### After Publishing

- Blog posts appear at `/blog` automatically
- Filename format: `YYYY-MM-DD-title-slug.md`
- Share the link on social media
- No need to rebuild or redeploy

---

## Authentication System

### How Magic Link Login Works

1. User enters their email
2. System sends a magic link to their email
3. User clicks the link
4. User is logged in automatically
5. Link expires after use

### User vs Admin Access

**Regular Users Can:**
- View available slots
- Book flights
- See their own bookings
- Update their profile
- View blog posts and FAQ

**Admins Can:**
- Everything users can do, PLUS:
- Access admin dashboard
- Create/delete slots
- View all bookings
- Update booking statuses
- Create blog posts

### Signing Out

Click the **"Sign Out"** button in the navigation bar (red button).

---

## Tips & Best Practices

### Availability Management

1. **Batch add slots:** Create multiple slots at once for the week/month
2. **Consistent pricing:** Keep prices predictable (e.g., always $150 for discovery flights)
3. **Clear descriptions:** Help students know what to expect
4. **Buffer time:** Don't overbook yourself - allow prep time between flights

### Customer Communication

1. **Check bookings daily:** Respond quickly to new bookings
2. **Update statuses:** Keep booking statuses current
3. **Read notes:** Students often include important info in booking notes
4. **Weather cancellations:** Proactively reach out if weather looks bad

### Content Strategy

1. **Blog regularly:** Aim for 1-2 posts per month
2. **Answer questions:** Turn common student questions into blog posts
3. **Share successes:** Highlight student milestones
4. **Seasonal content:** Write about seasonal flying considerations

### Security

1. **Never share admin password:** Keep your email account secure
2. **Log out on shared computers:** Always sign out when done
3. **Check booking details:** Verify customer info before flights
4. **Monitor unusual activity:** Watch for suspicious bookings

---

## Troubleshooting

### Can't Access Admin Dashboard

**Problem:** Getting redirected to homepage

**Solutions:**
1. Make sure you're logged in with admin email: `Isaac.Imp.Prestwich@gmail.com`
2. Check that you clicked the magic link to log in
3. Clear browser cache and try again
4. Try in incognito/private window

### Slot Won't Delete

**Problem:** Delete button doesn't work

**Solutions:**
1. Check if the slot is already booked (can't delete booked slots)
2. Cancel the booking first, then delete the slot
3. Refresh the page and try again

### Blog Post Not Showing Up

**Problem:** Created blog post but it's not on the site

**Solutions:**
1. Check `/blog` page - it should appear immediately
2. Verify you filled in all required fields (Title, Author, Excerpt, Content)
3. Check for error message after clicking "Create Blog Post"
4. Try creating again with a different title

### Booking Status Won't Update

**Problem:** Status dropdown doesn't save changes

**Solutions:**
1. Refresh the page and try again
2. Check your internet connection
3. Look for error messages in browser console (F12)
4. Try a different browser

---

## Quick Reference

### Pricing Guide

| Service | Suggested Price (cents) | Display Price |
|---------|------------------------|---------------|
| Discovery Flight | 15000 | $150.00 |
| Hour Flight Lesson | 20000 | $200.00 |
| 2-Hour Flight Lesson | 30000 | $300.00 |
| NYC Tour (1 hour) | 25000 | $250.00 |
| NYC Tour (2 hours) | 40000 | $400.00 |

### Booking Status Workflow

```
New Booking
    ↓
Pending (payment processing)
    ↓
Paid (payment received)
    ↓
Confirmed (ready to fly)
    ↓
Completed (flight done)
```

### Admin URLs

- **Admin Dashboard:** `/admin`
- **Login Page:** `/login`
- **Blog Management:** `/admin` (Blog tab)
- **Slot Management:** `/admin` (Slots tab)
- **Bookings View:** `/admin` (Bookings tab)

---

## Support

If you encounter issues not covered in this guide:

1. Check browser console for error messages (F12 → Console)
2. Try in incognito/private browsing mode
3. Clear browser cache and cookies
4. Contact your developer with specific error messages

**Remember:** Changes take effect immediately. No need to rebuild or redeploy the site!
