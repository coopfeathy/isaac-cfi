import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

// Helper function to map performance ratings to grade labels
const getPerformanceGrade = (rating: number): { arrows: string; label: string } => {
  switch (Math.round(rating)) {
    case 4:
      return { arrows: "&#9650;&#9650;", label: "Exceeds Standards" }
    case 3:
      return { arrows: "&#9650;", label: "Meets Standards" }
    case 2:
      return { arrows: "&#9660;", label: "Progressing" }
    case 1:
      return { arrows: "&#9660;&#9660;", label: "Needs Reinforcement" }
    default:
      return { arrows: "&mdash;", label: "Not Evaluated" }
  }
}
// Shared brand constants for email templates
const brand = {
  gold: "#FFBF00",
  dark: "#0B0B0B",
  lightBg: "#F9FAFB",
  borderColor: "#E5E7EB",
  mutedText: "#6B7280",
  logoUrl: "https://isaac-cfi.netlify.app/merlin-logo.png",
  font: "'Inter', 'Helvetica Neue', Arial, sans-serif",
}

// Reusable email wrapper with Merlin branding
const emailWrapper = (content: string) => `
  <div style="font-family: ${brand.font}; max-width: 640px; margin: 0 auto; background: #FFFFFF; color: ${brand.dark};">
    <div style="background: ${brand.dark}; padding: 12px 32px; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between;">
      <div style="flex: 1; text-align: center; padding-right: 80px;">
        <p style="margin: 0; color: #FFFFFF; font-family: ${brand.font}; font-size: 28px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Merlin Flight Training</p>
        <p style="margin: 4px 0 0 0; color: ${brand.gold}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Pilot Flight Instruction</p>
      </div>
      <img src="${brand.logoUrl}" alt="Merlin Flight Training" style="width: 140px; height: 140px; object-fit: contain; flex-shrink: 0; align-self: center; margin-top: 25px;" />
    </div>
    <div style="padding: 32px;">
      ${content}
    </div>
    <div style="background: ${brand.lightBg}; padding: 20px 32px; border-top: 1px solid ${brand.borderColor}; border-radius: 0 0 8px 8px; text-align: center;">
      <p style="margin: 0; color: ${brand.mutedText}; font-size: 12px;">Merlin Flight Training &bull; Professional Flight Instruction</p>

    </div>
  </div>
`
// Email templates
export const emailTemplates = {
  // Welcome email for new students
  welcome: (name: string) => ({
    subject: 'Welcome to Merlin Flight Training!',
    html: emailWrapper(`
      <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Welcome Aboard, ${name}!</h1>
      <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
      <p>Thank you for joining Merlin Flight Training. We're excited to help you achieve your aviation goals.</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Schedule your discovery flight</li>
        <li>Browse our aircraft fleet</li>
        <li>Review our training programs</li>
        <li>Meet our instructors</li>
      </ul>
      <p>If you have any questions, feel free to reply to this email.</p>
      <p>Blue skies ahead,<br/>The Merlin Flight Training Team</p>
    `),
  }),
  // Flight reminder
  flightReminder: (name: string, date: string, time: string) => ({
    subject: 'Flight Reminder - Merlin Flight Training',
    html: emailWrapper(`
      <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Upcoming Flight Reminder</h1>
      <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
      <p>Hi ${name},</p>
      <p>This is a reminder about your upcoming flight:</p>
      <div style="background: ${brand.lightBg}; border-left: 4px solid ${brand.gold}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${time}</p>
      </div>
      <p>Please arrive 15 minutes early for your pre-flight briefing.</p>
      <p>See you soon!<br/>Merlin Flight Training</p>
    `),
  }),
  // Generic broadcast template
  broadcast: (subject: string, message: string) => ({
    subject,
    html: emailWrapper(`
      <div style="white-space: pre-wrap;">${message}</div>
    `),
  }),
  // Lesson debrief + progress update sent after an instructor evaluation
  lessonEvaluation: (payload: {
    studentName: string
    courseTitle: string
    lessonTitle?: string | null
    performanceRating: number
    positiveObservations?: string | null
    negativeObservations?: string | null
    recommendedStudyPractice?: string | null
    progressSummary: Array<{ title: string; status: string }>
    imageUrls?: string[]
  }) => ({
    subject: `Training Debrief: ${payload.courseTitle} - Merlin Flight Training`,
    html: emailWrapper(`
      <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Pilot Debrief</h1>
      <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
      <p style="margin-top: 0; color: ${brand.mutedText};">Hi ${payload.studentName}, here is your training debrief from Merlin Flight Training.</p>
      <div style="background: ${brand.dark}; color: #FFFFFF; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: ${brand.gold}; font-weight: 600;">Lesson Summary</p>
        <p style="margin: 0 0 6px 0; font-size: 16px;"><strong>Course:</strong> ${payload.courseTitle}</p>
        ${payload.lessonTitle ? `<p style="margin: 0 0 6px 0; font-size: 16px;"><strong>Lesson:</strong> ${payload.lessonTitle}</p>` : ""}
        <p style="margin: 0; font-size: 16px;"><strong>Performance:</strong> <span style="color: ${brand.gold}; font-weight: 700;">${getPerformanceGrade(payload.performanceRating).arrows}</span></p>
      </div>
      ${payload.positiveObservations ? `
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Positive Performance Observations</h3>
        <p style="margin: 8px 0 0 0; white-space: pre-wrap; line-height: 1.6;">${payload.positiveObservations}</p>
      </div>` : ""}

      ${payload.negativeObservations ? `
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Negative Performance Observations</h3>
        <p style="margin: 8px 0 0 0; white-space: pre-wrap; line-height: 1.6;">${payload.negativeObservations}</p>
      </div>` : ""}
      ${payload.recommendedStudyPractice ? `
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Recommended Study and Practice</h3>
        <p style="margin: 8px 0 0 0; white-space: pre-wrap; line-height: 1.6;">${payload.recommendedStudyPractice}</p>
      </div>` : ""}

      ${payload.imageUrls && payload.imageUrls.length > 0 ? `
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Debrief Photos</h3>
        ${payload.imageUrls.map((url) => `
          <div style="margin: 8px 0;">
            <img src="${url}" alt="Debrief photo" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid ${brand.borderColor};" />
          </div>`).join("")}
      </div>` : ""}


      <div style="margin: 28px 0 0 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Training Progress Overview</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${payload.progressSummary
            .slice(0, 10)
            .map((item, i) => `
              <tr style="background: ${i % 2 === 0 ? brand.lightBg : "#FFFFFF"};">
                <td style="padding: 10px 12px; border-bottom: 1px solid ${brand.borderColor};">${item.title}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid ${brand.borderColor}; text-align: right; font-weight: 600; color: ${brand.mutedText};">${item.status.replace(/_/g, " ")}</td>
              </tr>`)
            .join("")}
        </table>
      </div>
      <div style="margin-top: 28px; text-align: center;">
        <a href="https://isaac-cfi.netlify.app/progress" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">View Full Progress Dashboard</a>
      </div>

      <p style="margin-top: 24px; color: ${brand.mutedText}; font-size: 13px; text-align: center;">Thank you for flying at Merlin Flight Training.</p>
    `),
  }),

  // Prospect welcome email — day-0 confirmation after discovery flight signup
  prospectWelcome: (name: string) => ({
    subject: 'Your Discovery Flight is Confirmed — What Happens Next',
    html: emailWrapper(`
      <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Welcome, ${name}!</h1>
      <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
      <p>Thank you for signing up for a discovery flight with Merlin Flight Training. We're thrilled you're taking this step — here's what to expect next:</p>
      <ul style="line-height: 1.9; padding-left: 20px;">
        <li>Your instructor will reach out within 1–2 business days to confirm your time slot.</li>
        <li>Your discovery flight will be approximately 60–90 minutes.</li>
        <li>No prior experience is required — just bring your curiosity.</li>
      </ul>
      <div style="margin: 28px 0; text-align: center;">
        <a href="https://merlinflighttraining.com/careers" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">See Where Training Can Take You</a>
      </div>
      <p style="color: ${brand.mutedText}; font-size: 13px;">Blue skies ahead,<br/>The Merlin Flight Training Team</p>
    `),
  }),

  // Prospect follow-up — day 3
  prospectFollowUpDay3: (name: string) => ({
    subject: `Still thinking about flying, ${name}?`,
    html: emailWrapper(`
      <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Your Discovery Flight Awaits</h1>
      <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
      <p>Hi ${name},</p>
      <p>Just checking in — we know life gets busy. Your spot for a discovery flight at Merlin Flight Training is still open, but we're filling up fast for this month.</p>
      <p>A discovery flight is one of those experiences you won't forget. Sixty minutes over Long Island, with an experienced instructor by your side — and it might just change everything.</p>
      <p>Curious where aviation can take your career? <a href="https://merlinflighttraining.com/careers" style="color: ${brand.gold}; font-weight: 600; text-decoration: none;">See the full path from student to professional pilot.</a></p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="https://merlinflighttraining.com/discovery-flight" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">Book Your Flight</a>
      </div>
      <p style="color: ${brand.mutedText}; font-size: 13px;">Blue skies,<br/>The Merlin Flight Training Team</p>
    `),
  }),

  // Prospect follow-up — day 7
  prospectFollowUpDay7: (name: string) => ({
    subject: `Your flight is waiting, ${name}`,
    html: emailWrapper(`
      <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Ready When You Are</h1>
      <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
      <p>Hi ${name},</p>
      <p>We wanted to reach out one last time — our instructors have availability this week, and we'd love to get you in the air.</p>
      <div style="background: ${brand.lightBg}; border-left: 4px solid ${brand.gold}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0; font-style: italic; color: ${brand.dark};">"The discovery flight was the best decision I made. I had my private pilot license within a year and now I instruct here." — Merlin Graduate</p>
      </div>
      <p>There's no pressure, and no rush — but your first flight is just one click away.</p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="https://merlinflighttraining.com/discovery-flight" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">Schedule My Discovery Flight</a>
      </div>
      <p style="color: ${brand.mutedText}; font-size: 13px;">Blue skies,<br/>The Merlin Flight Training Team</p>
    `),
  }),

  // Post-discovery-flight follow-up — sent manually by admin after a
  // discovery flight to invite the prospect to fill out the
  // /start-training intake form and start their training journey.
  postDiscoveryStartTraining: (name?: string) => ({
    subject: 'Ready for Takeoff? Your Next Steps After Your Discovery Flight',
    html: emailWrapper(`
      <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Great Flight${name ? `, ${name}` : ''}!</h1>
      <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
      <p>Thank you for flying with us at Merlin Flight Training. We hope your discovery flight gave you a taste of what it's like behind the controls — and that you're as excited about aviation as we are.</p>
      <p>If you're ready to take the next step toward becoming a pilot, we've made it simple. Fill out our short Start Training form and we'll get you set up with an instructor, a training plan, and a clear path forward.</p>

      <div style="margin: 28px 0; text-align: center;">
        <a href="https://merlinflighttraining.com/start-training" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px;">Start Your Training →</a>
      </div>

      <h2 style="color: ${brand.dark}; margin: 28px 0 8px 0; font-size: 18px;">How to Get Started</h2>
      <div style="width: 30px; height: 2px; background: ${brand.gold}; margin-bottom: 16px;"></div>
      <p style="margin: 0 0 12px 0;">Here's a quick overview of what you'll need to begin training. Don't worry — none of this is required for your first lesson. You can start flying while you work through it.</p>

      <ol style="line-height: 1.8; padding-left: 20px; margin: 0 0 24px 0;">
        <li style="margin-bottom: 10px;">
          <strong>Fill out the Start Training form.</strong>
          Tell us your preferred training location and when you'd like to begin at
          <a href="https://merlinflighttraining.com/start-training" style="color: ${brand.gold}; font-weight: 600; text-decoration: none;">merlinflighttraining.com/start-training</a>.
        </li>
        <li style="margin-bottom: 10px;">
          <strong>FAA Third-Class Medical Certificate.</strong>
          Find an Aviation Medical Examiner at
          <a href="https://www.faa.gov/pilots/amelocator" style="color: ${brand.gold}; font-weight: 600; text-decoration: none;">faa.gov/pilots/amelocator</a>
          and fill out MedXPress beforehand.
        </li>
        <li style="margin-bottom: 10px;">
          <strong>Student Pilot Certificate (IACRA).</strong>
          Register at
          <a href="https://iacra.faa.gov/" style="color: ${brand.gold}; font-weight: 600; text-decoration: none;">iacra.faa.gov</a>
          — your instructor will review and sign your 8710-1.
        </li>
        <li style="margin-bottom: 10px;">
          <strong>TSA Citizenship Verification.</strong>
          US citizens: bring a passport or birth certificate + photo ID to your first lesson. Non-US citizens: apply at
          <a href="https://www.fts.tsa.dhs.gov/" style="color: ${brand.gold}; font-weight: 600; text-decoration: none;">fts.tsa.dhs.gov</a>.
        </li>
      </ol>

      <div style="background: ${brand.lightBg}; border-left: 4px solid ${brand.gold}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <p style="margin: 0; font-style: italic; color: ${brand.dark};">Most students earn their Private Pilot Certificate in 6–12 months. The sooner you start, the sooner you'll be in the air as pilot-in-command.</p>
      </div>

      <p>If you have any questions — about cost, scheduling, what to expect, or anything else — just reply to this email and I'll get back to you personally.</p>

      <p style="color: ${brand.mutedText}; font-size: 13px; margin-top: 28px;">
        Blue skies,<br/>
        Isaac Prestwich, CFII<br/>
        Merlin Flight Training
      </p>
    `),
  }),

  // Start-Training confirmation — sent after a discovery flight grad
  // fills out the /start-training intake form. This is the transition
  // from "prospect" to "student in onboarding".
  startTrainingConfirmation: (payload: {
    name: string
    preferredLocation: string
    earliestStart: string
  }) => {
    const locationLabels: Record<string, string> = {
      'long-island': 'Long Island, NY (FRG — Republic Airport)',
    }
    const locationLabel = locationLabels[payload.preferredLocation] || payload.preferredLocation
    return {
      subject: `Welcome to training, ${payload.name} — your next steps`,
      html: emailWrapper(`
        <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">You're in, ${payload.name}.</h1>
        <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
        <p>Your discovery flight convinced you — and we're thrilled you're taking the next step. Here's what you told us, and what happens now:</p>

        <div style="background: ${brand.lightBg}; border-left: 4px solid ${brand.gold}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <p style="margin: 0;"><strong>Training location:</strong> ${locationLabel}</p>
          <p style="margin: 10px 0 0 0;"><strong>Target first lesson:</strong> ${payload.earliestStart}</p>
        </div>

        <h2 style="color: ${brand.dark}; margin: 28px 0 8px 0; font-size: 18px;">Your pre-training checklist</h2>
        <div style="width: 30px; height: 2px; background: ${brand.gold}; margin-bottom: 16px;"></div>
        <p style="margin: 0 0 12px 0;">Everything below must be complete before your first solo flight. None of it is required for your very first lesson — you can start flying with us while you work through it.</p>

        <ol style="line-height: 1.8; padding-left: 20px; margin: 0 0 24px 0;">
          <li style="margin-bottom: 10px;">
            <strong>TSA Citizenship Verification.</strong>
            US citizens: bring a passport or birth cert + photo ID to your first lesson. Non-US citizens: apply at
            <a href="https://www.fts.tsa.dhs.gov/" style="color: ${brand.gold}; font-weight: 600; text-decoration: none;">fts.tsa.dhs.gov</a>.
          </li>
          <li style="margin-bottom: 10px;">
            <strong>FAA Third-Class Medical Certificate.</strong>
            Find an AME at
            <a href="https://www.faa.gov/pilots/amelocator" style="color: ${brand.gold}; font-weight: 600; text-decoration: none;">faa.gov/pilots/amelocator</a>
            and fill out MedXPress beforehand.
          </li>
          <li style="margin-bottom: 10px;">
            <strong>Student Pilot Certificate (IACRA).</strong>
            Register at
            <a href="https://iacra.faa.gov/" style="color: ${brand.gold}; font-weight: 600; text-decoration: none;">iacra.faa.gov</a>
            — your instructor will review and sign your 8710-1.
          </li>
          <li style="margin-bottom: 10px;">
            <strong>Merlin enrollment packet + deposit.</strong>
            We'll e-mail you the e-signature links right after your instructor reaches out.
          </li>
        </ol>

        <div style="margin: 28px 0; text-align: center;">
          <a href="https://merlinflighttraining.com/onboarding" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px;">Start Onboarding →</a>
        </div>

        <p>Your instructor will reach out within one business day to confirm your first lesson on or near <strong>${payload.earliestStart}</strong>. If you'd rather book a specific slot right now, you can use our live calendar:</p>

        <div style="margin: 20px 0; text-align: center;">
          <a href="https://merlinflighttraining.com/book-lesson" style="display: inline-block; background: transparent; color: ${brand.dark}; border: 2px solid ${brand.gold}; font-weight: 700; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px;">Pick a Lesson Time</a>
        </div>

        <p style="color: ${brand.mutedText}; font-size: 13px; margin-top: 28px;">
          Questions? Just reply to this email — it goes straight to your instructor.<br/><br/>
          Blue skies,<br/>The Merlin Flight Training Team
        </p>
      `),
    }
  },

  // Lesson scheduled notification
  lessonScheduled: (payload: {
    studentName: string
    lessonTitle?: string | null
    date: string
    time: string
    groundTopics?: string[] | null
    flightManeuvers?: string[] | null
  }) => ({
    subject: `Your Flight Lesson is Scheduled — ${payload.date}`,
    html: emailWrapper(`
      <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Lesson Scheduled</h1>
      <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
      <p>Hi ${payload.studentName},</p>
      <p>A flight lesson has been scheduled for you:</p>
      <div style="background: ${brand.lightBg}; border-left: 4px solid ${brand.gold}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0;"><strong>Date:</strong> ${payload.date}</p>
        <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${payload.time}</p>
        ${payload.lessonTitle ? `<p style="margin: 10px 0 0 0;"><strong>Lesson:</strong> ${payload.lessonTitle}</p>` : ''}
      </div>
      ${payload.groundTopics && payload.groundTopics.length > 0 ? `
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Ground Topics to Review</h3>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
          ${payload.groundTopics.map(topic => `<li>${topic}</li>`).join('')}
        </ul>
      </div>` : ''}
      ${payload.flightManeuvers && payload.flightManeuvers.length > 0 ? `
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Flight Maneuvers</h3>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
          ${payload.flightManeuvers.map(maneuver => `<li>${maneuver}</li>`).join('')}
        </ul>
      </div>` : ''}
      <div style="margin-top: 28px; text-align: center;">
        <a href="https://isaac-cfi.netlify.app/dashboard" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">View Your Dashboard</a>
      </div>
      <p style="margin-top: 20px;">Please arrive 15 minutes early for your pre-flight briefing.</p>
      <p>Blue skies,<br/>Merlin Flight Training</p>
    `),
  }),

  // Owner-facing alert when someone signs up / progresses through the prospect funnel.
  // Sent to MerlinFlightTraining@gmail.com so Isaac knows ASAP.
  prospectAdminAlert: (payload: {
    stage: string
    email: string
    details: Array<{ label: string; value: string }>
  }) => {
    const safeEmail = String(payload.email)
    const rows = payload.details
      .filter((d) => d.value !== undefined && d.value !== null && String(d.value).trim() !== '')
      .map(
        (d) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid ${brand.borderColor}; color: ${brand.mutedText}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; width: 40%; vertical-align: top;">${d.label}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid ${brand.borderColor}; color: ${brand.dark}; font-size: 14px; vertical-align: top;">${d.value}</td>
          </tr>`,
      )
      .join('')
    return {
      subject: `[Prospect] ${payload.stage} — ${safeEmail}`,
      html: emailWrapper(`
        <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 22px;">New Prospect Activity</h1>
        <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
        <div style="background: ${brand.lightBg}; border-left: 4px solid ${brand.gold}; padding: 14px 18px; border-radius: 0 6px 6px 0; margin: 0 0 20px 0;">
          <p style="margin: 0; font-size: 13px; color: ${brand.mutedText}; text-transform: uppercase; letter-spacing: 0.5px;">Stage</p>
          <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: ${brand.dark};">${payload.stage}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid ${brand.borderColor}; color: ${brand.mutedText}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; width: 40%; vertical-align: top;">Email</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid ${brand.borderColor}; color: ${brand.dark}; font-size: 14px; vertical-align: top;"><a href="mailto:${safeEmail}" style="color: ${brand.dark};">${safeEmail}</a></td>
          </tr>
          ${rows}
        </table>
        <div style="text-align: center; margin: 24px 0 8px 0;">
          <a href="https://merlinflighttraining.com/admin/prospects" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px;">Open in Admin</a>
        </div>
        <p style="color: ${brand.mutedText}; font-size: 12px; margin-top: 20px;">You're receiving this because you asked to be notified whenever someone signs up as a prospect.</p>
      `),
    }
  },
}
