import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

// Helper function to map performance ratings to grade labels
const getPerformanceGrade = (rating: number): { arrows: string; label: string } => {
  switch (Math.round(rating)) {
    case 4:
      return { arrows: "⬆️⬆️", label: "Above Average" }
    case 3:
      return { arrows: "⬆️", label: "Slightly Above Average" }
    case 2:
      return { arrows: "⬇️", label: "Slightly Below Average" }
    case 1:
      return { arrows: "⬇️⬇️", label: "Below Average" }
    default:
      return { arrows: "—", label: "Not Rated" }
  }
}

// Email templates
export const emailTemplates = {
  // Welcome email for new students
  welcome: (name: string) => ({
    subject: 'Welcome to Merlin Flight Training!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e3a8a;">Welcome Aboard, ${name}! ✈️</h1>
        <p>Thank you for joining Merlin Flight Training. We're excited to help you achieve your aviation dreams!</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Schedule your discovery flight</li>
          <li>Browse our aircraft fleet</li>
          <li>Review our training programs</li>
          <li>Meet our instructors</li>
        </ul>
        <p>If you have any questions, feel free to reply to this email.</p>
        <p>Blue skies ahead,<br/>The Merlin Flight Training Team</p>
      </div>
    `,
  }),

  // Flight reminder
  flightReminder: (name: string, date: string, time: string) => ({
    subject: 'Flight Reminder - Merlin Flight Training',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e3a8a;">Flight Reminder ✈️</h1>
        <p>Hi ${name},</p>
        <p>This is a reminder about your upcoming flight:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${time}</p>
        </div>
        <p>Please arrive 15 minutes early for pre-flight briefing.</p>
        <p>See you soon!<br/>Merlin Flight Training</p>
      </div>
    `,
  }),

  // Generic broadcast template
  broadcast: (subject: string, message: string) => ({
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="https://isaac-cfi.netlify.app/images/logo.png" alt="Merlin Flight Training" style="max-width: 200px; margin-bottom: 20px;" />
        <div style="white-space: pre-wrap;">${message}</div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 14px;">
          You're receiving this email because you're part of the Merlin Flight Training community.
        </p>
      </div>
    `,
  }),

  // Lesson debrief + progress update sent after an instructor evaluation
  lessonEvaluation: (payload: {
    studentName: string
    courseTitle: string
    lessonTitle?: string | null
    performanceRating: number
    positiveObservations?: string | null
    negativeObservations?: string | null
    referenceMaterials?: string | null
    recommendedStudyPractice?: string | null
    skillsNeedingWork?: string | null
    otherFeedback?: string | null
    satisfactory?: string | null
    unsatisfactory?: string | null
    deteriorating?: string | null
    recommendations?: string | null
    practiceToProficiency?: string | null
    briefingSummary?: string | null
    progressSummary: Array<{ title: string; status: string }>
  }) => ({
    subject: `Lesson Debrief: ${payload.courseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
        <h1 style="color: #1e3a8a; margin-bottom: 8px;">Lesson Debrief</h1>
        <p style="margin-top: 0; color: #4b5563;">Hi ${payload.studentName}, here is your latest update from Merlin Flight Training.</p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Course:</strong> ${payload.courseTitle}</p>
          ${payload.lessonTitle ? `<p style="margin: 0 0 8px 0;"><strong>Lesson:</strong> ${payload.lessonTitle}</p>` : ""}
          <p style="margin: 0;"><strong>Performance Grade:</strong> ${getPerformanceGrade(payload.performanceRating).arrows} ${getPerformanceGrade(payload.performanceRating).label}</p>
        </div>

        ${payload.briefingSummary ? `<h3 style="margin-bottom: 6px;">Briefing Notes</h3><p style="margin-top: 0; white-space: pre-wrap;">${payload.briefingSummary}</p>` : ""}
        ${payload.positiveObservations || payload.satisfactory ? `<h3 style="margin-bottom: 6px;">Positive Performance Observations</h3><p style="margin-top: 0; white-space: pre-wrap;">${payload.positiveObservations || payload.satisfactory}</p>` : ""}
        ${payload.negativeObservations || payload.unsatisfactory ? `<h3 style="margin-bottom: 6px;">Negative Performance Observations</h3><p style="margin-top: 0; white-space: pre-wrap;">${payload.negativeObservations || payload.unsatisfactory}</p>` : ""}
        ${payload.referenceMaterials || payload.deteriorating ? `<h3 style="margin-bottom: 6px;">Reference Materials and Standards</h3><p style="margin-top: 0; white-space: pre-wrap;">${payload.referenceMaterials || payload.deteriorating}</p>` : ""}
        ${payload.skillsNeedingWork || payload.practiceToProficiency ? `<h3 style="margin-bottom: 6px;">Knowledge and Skills Needing Work</h3><p style="margin-top: 0; white-space: pre-wrap;">${payload.skillsNeedingWork || payload.practiceToProficiency}</p>` : ""}
        ${payload.recommendedStudyPractice || payload.recommendations ? `<h3 style="margin-bottom: 6px;">Recommended Study and Practice</h3><p style="margin-top: 0; white-space: pre-wrap;">${payload.recommendedStudyPractice || payload.recommendations}</p>` : ""}
        ${payload.otherFeedback ? `<h3 style="margin-bottom: 6px;">Additional Feedback</h3><p style="margin-top: 0; white-space: pre-wrap;">${payload.otherFeedback}</p>` : ""}

        <h3 style="margin-bottom: 8px;">Syllabus Progress Snapshot</h3>
        <ul style="padding-left: 20px;">
          ${payload.progressSummary
            .slice(0, 10)
            .map((item) => `<li style="margin-bottom: 6px;"><strong>${item.title}:</strong> ${item.status.replace(/_/g, " ")}</li>`)
            .join("")}
        </ul>

        <p style="margin-top: 24px; color: #4b5563;">You can always log in to view your full progress dashboard.</p>
      </div>
    `,
  }),
}
