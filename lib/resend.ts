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
    strengths?: string | null
    improvements?: string | null
    homework?: string | null
    nextLessonFocus?: string | null
    progressSummary: Array<{ title: string; status: string }>
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
      ${payload.strengths ? `
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Strengths</h3>
        <p style="margin: 8px 0 0 0; white-space: pre-wrap; line-height: 1.6;">${payload.strengths}</p>
      </div>` : ""}

      ${payload.improvements ? `
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Areas for Development</h3>
        <p style="margin: 8px 0 0 0; white-space: pre-wrap; line-height: 1.6;">${payload.improvements}</p>
      </div>` : ""}
      ${payload.homework ? `
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Homework</h3>
        <p style="margin: 8px 0 0 0; white-space: pre-wrap; line-height: 1.6;">${payload.homework}</p>
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
}
