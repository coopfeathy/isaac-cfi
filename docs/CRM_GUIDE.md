# CRM System Setup & Usage Guide

## Overview

Your flight training platform now includes a comprehensive Customer Relationship Management (CRM) system to help you manage prospects, track student progress, and maintain currency requirements.

## Features

### 1. **Prospects Management** (`/prospects`)
- Track potential clients you've met
- Log where/when you met them
- Set follow-up reminders
- Track interest levels (hot/warm/cold)
- Log communication history
- Automatic follow-up reminders

### 2. **Student Records** (`/students`)
- Individual student files with complete training records
- Certificate information (type, number, medical class)
- Flight hours tracking (total, PIC, dual, instrument)
- Currency requirements:
  - Flight Review (BFR) tracking - 24 month requirement
  - IPC (Instrument Proficiency Check) - 6 month requirement
  - Rental currency - custom expiration dates
- Visual alerts for overdue or due-soon requirements
- Training stage tracking

### 3. **Communication Log**
- Track all interactions with prospects and students
- Email, SMS, phone calls, in-person meetings, notes
- Full history for each contact

### 4. **Automated Reminders**
- Automatic reminders created when you set follow-up dates
- Student currency reminders (30 days for flight review, 14 days for IPC, 7 days for rental)
- Configurable follow-up frequency for prospects

---

## Setup Instructions

### Step 1: Run the CRM Database Schema

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **"+ New query"**
4. Copy and paste the entire contents of `supabase/crm-schema.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)

This will create the following tables:
- `prospects` - Potential client tracking
- `students` - Student records and training progress
- `communications` - Communication log
- `reminders` - Automated follow-up reminders

### Step 2: Verify Row-Level Security

The schema automatically sets up security policies so only admins (you) can access CRM data. Make sure your profile has `is_admin = true` (you already did this for slot creation).

### Step 3: Access the CRM

After the site redeploys (Netlify will automatically deploy when you push to GitHub), you'll see new navigation links:

**Admin Navigation:**
- Dashboard (existing - slots, bookings, blog)
- **Prospects** (new)
- **Students** (new)

---

## Usage Guide

### Managing Prospects

**Adding a Prospect:**
1. Go to `/prospects`
2. Click **"Add Prospect"**
3. Fill in:
   - Full Name (required)
   - Email & Phone
   - Where you met them
   - Meeting date
   - Source (referral, event, etc.)
   - Interest Level:
     - **Hot** - Ready to book immediately
     - **Warm** - Interested, needs follow-up
     - **Cold** - Just looking, long-term prospect
   - Next follow-up date
   - Follow-up frequency (days between contacts)
   - Notes

**Follow-up System:**
- Set a "Next Follow-up Date" and the system will create a reminder
- The prospect card shows follow-up dates in red if overdue, green if upcoming
- Set "Follow-up Frequency" to automatically schedule recurring reminders

**Logging Communication:**
- Click **"Log Contact"** on any prospect card
- Add notes about phone calls, emails, meetings
- View full history by clicking **"History"**

**Status Management:**
- **Active** - Currently prospecting
- **Converted** - Became a student/customer
- **Lost** - Decided not to pursue training
- **Inactive** - On hold or no longer responding

**Example Workflow:**
1. Meet someone at an EAA meeting
2. Add them as a prospect: "Met at EAA Chapter 123, interested in Private Pilot"
3. Set follow-up for 3 days
4. After calling them, click "Log Contact" and add notes
5. Set next follow-up based on their interest level
6. When they book their first flight, change status to "Converted"

---

### Managing Student Records

**Adding a Student:**
1. Go to `/students`
2. Click **"Add Student"**
3. Fill in two tabs:

**Personal & Contact Tab:**
- Name, email, phone
- Training stage (pre-solo, cross-country prep, checkride prep, etc.)
- Status (active, inactive, completed, on hold)
- Flight hours (total, PIC, dual, instrument)
- Notes (training goals, areas to focus on)

**Certificates & Currency Tab:**
- Certificate type (student, private, instrument, commercial, CFI, etc.)
- Certificate number
- Medical class (1st, 2nd, 3rd, BasicMed) and expiration
- **Flight Review tracking:**
  - Last flight review date
  - Due date (automatically calculated as +24 months, or set custom)
- **IPC tracking:**
  - Last IPC date
  - Due date (automatically calculated as +6 months)
- **Rental Currency:**
  - Checkout date
  - Currency expiration date

**Currency Alerts:**
Student cards show visual warnings:
- 🔴 **Red** - Overdue (past due date)
- 🟡 **Yellow** - Due soon (within warning period)
- 🟢 **Green** - Current (plenty of time)

Warning periods:
- Flight Review: 30 days before due
- IPC: 14 days before due
- Rental Currency: 7 days before due

**Automatic Reminders:**
When you enter or update currency dates, the system automatically creates reminders in the database. (Future enhancement will send emails/SMS)

**Example Workflow:**
1. Student completes Private Pilot checkride
2. Add their certificate info and number
3. Set their flight review date as the checkride date
4. Flight review due date auto-populates to 2 years later
5. 30 days before it's due, a reminder is created
6. The student card shows a yellow warning
7. After completing the flight review, update the date
8. New reminder is created for 2 years from new date

---

### Communication Tracking

**For Prospects:**
- Click "Log Contact" on prospect card
- Select type: email, SMS, phone, in_person, or note
- Add details about the conversation
- View history by clicking "History"

**For Students:**
(Coming in future update - will integrate with student records)

---

## Best Practices

### Prospect Management
1. **Add prospects immediately** after meeting them while details are fresh
2. **Set realistic follow-up dates** - don't let hot leads go cold
3. **Use interest levels** to prioritize your time:
   - Hot prospects: Follow up within 24-48 hours
   - Warm prospects: Weekly check-ins
   - Cold prospects: Monthly or quarterly touches
4. **Log all communication** to track what you've discussed
5. **Update status promptly** when prospects convert or are lost

### Student Records
1. **Create records when students start training**
2. **Update hours regularly** (after each lesson or monthly)
3. **Set all currency dates** as soon as they apply:
   - New private pilot: Set flight review date as checkride date
   - Instrument rating: Set IPC date as checkride date
   - Rental checkout: Set currency expiration
4. **Review overdue alerts weekly** and reach out to students
5. **Use training stage** to track progress:
   - "Pre-solo - working on landings"
   - "Solo cross-country planning"
   - "Checkride prep - oral review needed"
6. **Use notes field** for important details:
   - Learning style preferences
   - Areas that need extra focus
   - Goals and timeline
   - Medical concerns or limitations

### Currency Management
**Flight Reviews (every 24 months):**
- Always update after completing a flight review
- System will create reminder 30 days before due
- Consider offering flight review specials as due dates approach

**IPCs (every 6 months for instrument currency):**
- Track for all instrument-rated pilots
- Offer IPC packages
- Contact students 2 weeks before expiration

**Rental Currency:**
- Set your own policy (e.g., 90-day currency)
- Update after checkout flights
- Proactively reach out before expiration

---

## Future Enhancements (Coming Soon)

### Email & SMS Integration
- **Email notifications** for currency reminders
- **SMS alerts** for overdue requirements
- **Bulk email campaigns** to prospects
- **Automated follow-up sequences**

We'll need to set up:
- Email service (Resend or SendGrid)
- SMS service (Twilio)

### Dashboard Improvements
- CRM overview widget on main dashboard
- Quick stats (prospects by status, students with overdue currency)
- Upcoming reminders list
- Recent communications feed

### Additional Features
- File attachments (certificates, medicals, endorsements)
- Training syllabus tracking
- Lesson scheduling integration
- Invoice/payment tracking
- Student portal (students can view their own records)

---

## Database Maintenance

### Backing Up Data
Your data is automatically backed up by Supabase, but you can also export:
1. Go to Supabase Dashboard → Table Editor
2. Select a table (prospects, students, etc.)
3. Click export button (CSV format)

### Data Privacy
- Only admins can see CRM data
- Students cannot see other students' records
- All communication logs are private
- Complies with standard data protection practices

### Cleaning Up Old Data
Periodically review and clean up:
- **Lost prospects** - Archive or delete after 1 year
- **Inactive students** - Update status, keep records for 7 years (FAA requirement)
- **Old communications** - Can delete after 1 year if needed

---

## Troubleshooting

### Can't access Prospects or Students pages
- Make sure you're logged in with the admin email
- Verify `is_admin = true` in your profile (same fix as slot creation)

### Currency reminders not showing
- Reminders are created in the database but emails/SMS require additional setup
- Check the `reminders` table in Supabase to see if they were created
- Email/SMS integration coming in next update

### Can't add students
- Check Row-Level Security policies were created (run the schema script)
- Verify you're logged in as admin
- Check browser console for errors

### Data not saving
- Check your internet connection
- Look for error messages in browser console (F12)
- Verify Supabase is online (check dashboard)

---

## Quick Reference

### Color Coding

**Prospect Interest Levels:**
- 🔴 Hot - Ready to book
- 🟡 Warm - Interested
- 🔵 Cold - Long-term

**Prospect Status:**
- 🟢 Active - Currently prospecting
- 🟣 Converted - Now a student
- 🔴 Lost - Won't proceed
- ⚪ Inactive - On hold

**Student Status:**
- 🟢 Active - Currently training
- ⚪ Inactive - Not currently flying
- 🔵 Completed - Finished training
- 🟡 On Hold - Temporarily paused

**Currency Alerts:**
- 🔴 Overdue - Past due date
- 🟡 Due Soon - Within warning period
- 🟢 Current - Plenty of time

---

## Support

If you need help or want additional features added to the CRM:
1. Check this guide first
2. Look for error messages in the browser console
3. Check the Supabase database to verify data is saving
4. Contact for custom modifications or enhancements

---

## Summary

You now have a professional-grade CRM system that will help you:
- ✅ Never lose track of a prospect
- ✅ Stay on top of follow-ups
- ✅ Maintain student currency requirements
- ✅ Provide better customer service
- ✅ Grow your flight training business

**Next Steps:**
1. Run the database schema in Supabase
2. Add your first prospect
3. Create student records for current students
4. Set up currency tracking for all pilots
5. Start logging communications

The system will save you time, help you stay organized, and ensure your students stay current!
