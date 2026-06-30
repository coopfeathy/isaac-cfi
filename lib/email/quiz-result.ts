// Quiz funnel result emails — sent to leads after they complete the
// "Can You Be a Pilot?" quiz and submit their name + email.
//
// Three outcome variants: yes / maybe / no
// Plus a notification email sent to Isaac for every new quiz lead.
//
// Design: light-body (ATP-professional x Higgsfield-urgency hybrid).
// Dark branded header → clean white body → gold CTAs.

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export const QUIZ_EMAIL_FROM = 'Merlin Flight Training <noreply@merlinflighttraining.com>'
export const QUIZ_EMAIL_REPLY_TO = 'isaac.prestwich@merlinflighttraining.com'
export const ISAAC_EMAIL = 'isaac.prestwich@merlinflighttraining.com'

const DISCOVERY_URL = 'https://merlinflighttraining.com/book-discovery'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// ── Shared light shell ────────────────────────────────────────────────────────
// Dark branded header, clean white body, warm off-white page bg.

function shell(
  preheader: string,
  badgeText: string,
  badgeColor: string,
  body: string,
  darkNotification = false,
): string {
  const pageBg  = darkNotification ? '#05090c' : '#F0EFE9'
  const cardBg  = darkNotification ? '#080F14' : '#FFFFFF'
  const cardBorder = darkNotification ? '#2A313B' : '#E5E7EB'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="${darkNotification ? 'dark' : 'light'}" />
<title>${escapeHtml(preheader)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: ${pageBg}; font-family: Inter, 'Helvetica Neue', Arial, sans-serif; }
  .mono { font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace; }
  @media (prefers-color-scheme: dark) {
    body { background: ${pageBg} !important; }
  }
</style>
</head>
<body>
<!-- preheader -->
<div style="display:none;font-size:1px;color:${pageBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(preheader)}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background:${pageBg};padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${cardBg};border:1px solid ${cardBorder};border-radius:4px;overflow:hidden">

  <!-- ── HEADER ── -->
  <tr>
    <td style="background:${darkNotification ? '#0B0B0B' : '#1C1C1E'};padding:20px 28px;border-bottom:3px solid #FFBF00">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" width="40">
          <div style="width:32px;height:32px;background:#FFBF00;color:#000;text-align:center;line-height:32px;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;font-weight:700;font-size:17px">M</div>
        </td>
        <td valign="middle" style="padding-left:12px">
          <div style="color:#A1A8B3;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">MERLIN FLIGHT TRAINING</div>
          <div style="color:#E6E9ED;font-size:15px;font-weight:600;margin-top:2px;letter-spacing:-0.2px">Northeast Philadelphia · KPNE</div>
        </td>
        <td valign="middle" align="right">
          <span style="display:inline-block;padding:4px 10px;font-size:9.5px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;color:${badgeColor};background:${badgeColor}18;border:1px solid ${badgeColor}55">${escapeHtml(badgeText)}</span>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- ── BODY ── -->
  <tr><td>${body}</td></tr>

  <!-- ── FOOTER ── -->
  <tr>
    <td style="background:${darkNotification ? '#0B0B0B' : '#F9FAFB'};padding:20px 28px;border-top:1px solid ${cardBorder};text-align:center">
      <p style="margin:0;font-size:11px;color:${darkNotification ? '#6E7681' : '#9CA3AF'};font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;letter-spacing:0.12em;text-transform:uppercase;line-height:1.8">
        Merlin Flight Training · KPNE · Northeast Philadelphia, PA<br/>
        <a href="mailto:${QUIZ_EMAIL_REPLY_TO}" style="color:${darkNotification ? '#6E7681' : '#9CA3AF'};text-decoration:none">${QUIZ_EMAIL_REPLY_TO}</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ── Shared light-body helpers ─────────────────────────────────────────────────

function divider(): string {
  return `<tr><td style="padding:0 28px"><div style="height:1px;background:#F3F4F6"></div></td></tr>`
}

// ── YES outcome ───────────────────────────────────────────────────────────────

export function renderQuizResultYes(name: string): RenderedEmail {
  const firstName = escapeHtml(name.split(' ')[0] || name)
  const subject = `${name.split(' ')[0]}, you can become a pilot ✈️`

  const steps = [
    { n: '1', title: 'Book a Discovery Flight', desc: 'Get in the cockpit and feel what it\'s like — you\'ll take the controls over Philadelphia.', time: 'This week' },
    { n: '2', title: 'Get Your FAA Medical', desc: 'A 3rd-class medical from an Aviation Medical Examiner (AME). Pre-screen at MedXPress.faa.gov.', time: '~1–2 weeks' },
    { n: '3', title: 'Start Flight Training', desc: 'Weekly lessons in a Grumman Cheetah AA-5A with CFII Isaac Prestwich at KPNE.', time: 'Months 1–6' },
    { n: '4', title: 'Pass Your Checkride', desc: 'Oral exam + practical test with an FAA DPE. You\'re a licensed Private Pilot.', time: '~6–12 months' },
  ]

  const body = `
    <!-- Hero image -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0;line-height:0">
          <img src="https://app.merlinflighttraining.com/quiz-email-hero.png" alt="Merlin Flight Training" width="600" style="display:block;width:100%;max-width:600px;height:auto" />
        </td>
      </tr>
    </table>

    <!-- Hero callout -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#1C1C1E;padding:36px 28px 32px;text-align:center">
          <div style="display:inline-block;background:#FFBF00;color:#000;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;padding:5px 14px;margin-bottom:16px">YOUR RESULT</div>
          <h1 style="margin:0;color:#FFFFFF;font-size:30px;font-weight:800;line-height:1.2;letter-spacing:-0.5px">Yes — You Can Be a Pilot.</h1>
          <p style="margin:12px 0 0;color:#A1A8B3;font-size:15px;line-height:1.6">Based on your answers, you're a strong candidate<br/>for your Private Pilot Certificate.</p>
        </td>
      </tr>

      <!-- Greeting -->
      <tr><td style="padding:32px 28px 8px">
        <p style="margin:0;font-size:15px;color:#111827;line-height:1.7">Hey ${firstName},</p>
        <p style="margin:12px 0 0;font-size:15px;color:#374151;line-height:1.7">
          Great news — your quiz results show you're ready to start. Here's the exact path from where you are now to the cockpit.
        </p>
      </td></tr>

      <!-- Roadmap label -->
      <tr><td style="padding:24px 28px 12px">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6B7280;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;padding-bottom:10px;border-bottom:2px solid #FFBF00;display:inline-block">Your Pilot Roadmap</div>
      </td></tr>

      <!-- Steps -->
      ${steps.map((s, i) => `
      <tr><td style="padding:${i === 0 ? '4' : '0'}px 28px ${i === steps.length - 1 ? '28' : '4'}px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top" width="44" style="padding-top:2px">
              <div style="width:32px;height:32px;background:#FFBF00;color:#000;font-weight:800;font-size:13px;text-align:center;line-height:32px;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">${s.n}</div>
            </td>
            <td valign="top" style="padding-left:12px;padding-bottom:20px;border-bottom:${i < steps.length - 1 ? '1px solid #F3F4F6' : 'none'}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <strong style="font-size:14px;color:#111827;font-weight:700">${s.title}</strong>
                <span style="font-size:10px;font-weight:700;color:#FFBF00;background:#FFF9E6;padding:3px 8px;border-radius:2px;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;letter-spacing:0.08em;white-space:nowrap;margin-left:12px">${s.time}</span>
              </div>
              <p style="margin:5px 0 0;font-size:13px;color:#6B7280;line-height:1.6">${s.desc}</p>
            </td>
          </tr>
        </table>
      </td></tr>`).join('')}

      <!-- CTA -->
      <tr><td style="padding:8px 28px 32px;text-align:center">
        <a href="${DISCOVERY_URL}" style="display:inline-block;background:#FFBF00;color:#000000;text-decoration:none;font-weight:800;font-size:13px;padding:16px 32px;letter-spacing:0.12em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">Book a Discovery Flight →</a>
        <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF">Spots are limited — Isaac flies one student at a time.</p>
      </td></tr>

      <!-- Sign-off -->
      <tr><td style="padding:0 28px 32px;border-top:1px solid #F3F4F6">
        <p style="margin:24px 0 4px;font-size:14px;color:#374151;line-height:1.7">Questions? Just reply to this email — I read every one.</p>
        <p style="margin:0;font-size:14px;color:#111827;font-weight:700">Isaac Prestwich, CFII</p>
        <p style="margin:2px 0 0;font-size:13px;color:#6B7280">Merlin Flight Training · KPNE</p>
      </td></tr>
    </table>`

  return {
    subject,
    html: shell(`${name.split(' ')[0]}, your pilot quiz results are in ✈️`, 'YES ✓', '#16A34A', body),
    text: [
      `Hey ${name.split(' ')[0]},`,
      ``,
      `YES — You can be a pilot! Based on your answers, you're a strong candidate for your Private Pilot Certificate.`,
      ``,
      `YOUR ROADMAP`,
      `1. Book a Discovery Flight — this week`,
      `   ${DISCOVERY_URL}`,
      `2. Get Your FAA Medical — ~1–2 weeks`,
      `3. Start Flight Training — months 1–6`,
      `4. Pass Your Checkride — ~6–12 months`,
      ``,
      `Questions? Just reply to this email.`,
      ``,
      `Isaac Prestwich, CFII`,
      `Merlin Flight Training · KPNE`,
    ].join('\n'),
  }
}

// ── MAYBE outcome ─────────────────────────────────────────────────────────────

export function renderQuizResultMaybe(name: string): RenderedEmail {
  const firstName = escapeHtml(name.split(' ')[0] || name)
  const subject = `${name.split(' ')[0]}, one quick thing before you start`

  const body = `
    <!-- Hero image -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0;line-height:0">
          <img src="https://app.merlinflighttraining.com/quiz-email-hero.png" alt="Merlin Flight Training" width="600" style="display:block;width:100%;max-width:600px;height:auto" />
        </td>
      </tr>
    </table>

    <!-- Hero -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#1C1C1E;padding:36px 28px 32px;text-align:center">
          <div style="display:inline-block;background:#FFBF00;color:#000;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;padding:5px 14px;margin-bottom:16px">YOUR RESULT</div>
          <h1 style="margin:0;color:#FFFFFF;font-size:28px;font-weight:800;line-height:1.2;letter-spacing:-0.5px">Probably Yes — One Thing to Clarify.</h1>
          <p style="margin:12px 0 0;color:#A1A8B3;font-size:15px;line-height:1.6">You're a strong candidate. One answer flagged<br/>something worth a quick conversation.</p>
        </td>
      </tr>

      <tr><td style="padding:32px 28px 0">
        <p style="margin:0;font-size:15px;color:#111827;line-height:1.7">Hey ${firstName},</p>
        <p style="margin:12px 0 24px;font-size:15px;color:#374151;line-height:1.7">
          Your quiz results put you in a great position — but one of your answers flagged something that's worth a quick 15-minute conversation before you dive in. Most people in your situation find a clear path forward once we talk.
        </p>

        <!-- Urgency callout -->
        <div style="background:#FFFBEB;border-left:4px solid #FFBF00;padding:18px 20px;margin-bottom:24px">
          <div style="font-size:13px;font-weight:800;color:#92400E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Don't leave this on the table</div>
          <p style="margin:0;font-size:14px;color:#78350F;line-height:1.6">A lot of people with your profile assume there's a blocker when there isn't one. Let's find out — it's a free 15-minute call.</p>
        </div>
      </td></tr>

      <tr><td style="padding:0 28px 32px;text-align:center">
        <a href="${DISCOVERY_URL}" style="display:inline-block;background:#FFBF00;color:#000000;text-decoration:none;font-weight:800;font-size:13px;padding:16px 32px;letter-spacing:0.12em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">Talk to Isaac — It's Free →</a>
        <p style="margin:14px 0 0;font-size:12px;color:#9CA3AF">Or just reply to this email. I'll get back to you within 24 hours.</p>
      </td></tr>

      <tr><td style="padding:0 28px 32px;border-top:1px solid #F3F4F6">
        <p style="margin:24px 0 4px;font-size:14px;color:#374151">Looking forward to it,</p>
        <p style="margin:0;font-size:14px;color:#111827;font-weight:700">Isaac Prestwich, CFII</p>
        <p style="margin:2px 0 0;font-size:13px;color:#6B7280">Merlin Flight Training · KPNE</p>
      </td></tr>
    </table>`

  return {
    subject,
    html: shell(`${name.split(' ')[0]}, your pilot quiz result — one thing to clarify`, 'ALMOST →', '#D97706', body),
    text: [
      `Hey ${name.split(' ')[0]},`,
      ``,
      `Probably Yes — one thing to clarify first.`,
      ``,
      `You're a strong candidate, but one answer flagged something worth a quick conversation. Most people in your situation find a clear path forward once we talk.`,
      ``,
      `Book a free 15-min call: ${DISCOVERY_URL}`,
      ``,
      `Or just reply — I'll get back within 24 hours.`,
      ``,
      `Isaac Prestwich, CFII`,
      `Merlin Flight Training · KPNE`,
    ].join('\n'),
  }
}

// ── NO outcome ────────────────────────────────────────────────────────────────

export function renderQuizResultNo(name: string): RenderedEmail {
  const firstName = escapeHtml(name.split(' ')[0] || name)
  const subject = `${name.split(' ')[0]}, there may be a hurdle — but don't give up`

  const body = `
    <!-- Hero image -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0;line-height:0">
          <img src="https://app.merlinflighttraining.com/quiz-email-hero.png" alt="Merlin Flight Training" width="600" style="display:block;width:100%;max-width:600px;height:auto" />
        </td>
      </tr>
    </table>

    <!-- Hero -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#1C1C1E;padding:36px 28px 32px;text-align:center">
          <div style="display:inline-block;background:#FFBF00;color:#000;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;padding:5px 14px;margin-bottom:16px">YOUR RESULT</div>
          <h1 style="margin:0;color:#FFFFFF;font-size:28px;font-weight:800;line-height:1.2;letter-spacing:-0.5px">Not Quite Yet — But Don't Give Up.</h1>
          <p style="margin:12px 0 0;color:#A1A8B3;font-size:15px;line-height:1.6">There may be a hurdle right now — but flying<br/>isn't off the table forever.</p>
        </td>
      </tr>

      <tr><td style="padding:32px 28px 0">
        <p style="margin:0;font-size:15px;color:#111827;line-height:1.7">Hey ${firstName},</p>
        <p style="margin:12px 0 24px;font-size:15px;color:#374151;line-height:1.7">
          Based on your answers, there's at least one hurdle in the way right now. But that doesn't mean flying is off the table forever — many pilots face early challenges and find a path forward.
        </p>

        <div style="background:#F9FAFB;border:1px solid #E5E7EB;padding:20px;margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px">Your situation may have options the quiz can't see.</div>
          <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6">Isaac can take a look at your specific answers, explain exactly what the hurdle means, and tell you whether there's a path around it — whether that's BasicMed, Sport Pilot, or simply waiting on timing.</p>
        </div>
      </td></tr>

      <tr><td style="padding:0 28px 32px;text-align:center">
        <a href="${DISCOVERY_URL}" style="display:inline-block;background:#111827;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:13px;padding:16px 32px;letter-spacing:0.12em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">Talk to Isaac →</a>
        <p style="margin:14px 0 0;font-size:12px;color:#9CA3AF">Or reply to this email with your situation — I'm happy to give you a real answer.</p>
      </td></tr>

      <tr><td style="padding:0 28px 32px;border-top:1px solid #F3F4F6">
        <p style="margin:24px 0 4px;font-size:14px;color:#374151">Don't count yourself out,</p>
        <p style="margin:0;font-size:14px;color:#111827;font-weight:700">Isaac Prestwich, CFII</p>
        <p style="margin:2px 0 0;font-size:13px;color:#6B7280">Merlin Flight Training · KPNE</p>
      </td></tr>
    </table>`

  return {
    subject,
    html: shell(`${name.split(' ')[0]}, your pilot quiz result`, 'NOT YET', '#DC2626', body),
    text: [
      `Hey ${name.split(' ')[0]},`,
      ``,
      `Not quite yet — but don't give up.`,
      ``,
      `There may be a hurdle right now, but it doesn't mean flying is off the table forever. Your situation may have options the quiz can't account for.`,
      ``,
      `Talk to Isaac: ${DISCOVERY_URL}`,
      ``,
      `Or just reply to this email.`,
      ``,
      `Isaac Prestwich, CFII`,
      `Merlin Flight Training · KPNE`,
    ].join('\n'),
  }
}

// ── Isaac notification (keep dark — internal tool aesthetic) ─────────────────

export interface QuizLeadNotificationInput {
  prospectId: string
  fullName: string
  email: string
  outcome: 'yes' | 'maybe' | 'no'
  answers: Record<string, string>
}

const ANSWER_LABELS: Record<string, Record<string, string>> = {
  age:      { under_17: 'Under 17', '17_25': '17–25', '25_40': '25–40', '40_plus': '40+' },
  citizen:  { citizen: 'U.S. Citizen', green_card: 'Perm. Resident', visa: 'On a Visa', unsure_citizen: 'Not sure' },
  medical:  { healthy: 'Healthy', minor: 'Minor issues', serious: 'Serious condition', denied: 'Previously denied' },
  finance:  { ready: 'Ready to invest', finance: 'Wants financing', exploring: 'Still budgeting', timing: 'Depends on timing' },
  schedule: { asap: 'ASAP', month: 'Within a month', quarter: 'Within 3–6 months', exploring: 'Just exploring' },
  timeline: { fast: 'As fast as possible', steady: 'Steady pace', slow: 'Slow & steady', flexible: 'No preference' },
}

export function renderQuizLeadNotification(input: QuizLeadNotificationInput): RenderedEmail {
  const outcomeColor = input.outcome === 'yes' ? '#34D87A' : input.outcome === 'maybe' ? '#F59E0B' : '#EF4444'
  const outcomeLabel = input.outcome === 'yes' ? 'YES ✓' : input.outcome === 'maybe' ? 'MAYBE →' : 'NOT YET'

  function row(label: string, value: string): string {
    return `<tr>
      <td style="padding:5px 6px 5px 0;font-size:9.5px;color:#6E7681;letter-spacing:0.18em;text-transform:uppercase;width:40%;vertical-align:top;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">${escapeHtml(label)}</td>
      <td style="padding:5px 0;color:#E6E9ED;font-size:12px;vertical-align:top">${value}</td>
    </tr>`
  }

  const answerRows = Object.entries(input.answers)
    .map(([key, val]) => row(key, escapeHtml(ANSWER_LABELS[key]?.[val] ?? val)))
    .join('')

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:24px 28px 8px;color:#E6E9ED">
        <p style="margin:0;color:#E6E9ED;font-size:14.5px">Hey Isaac,</p>
        <p style="margin:10px 0 0;color:#A1A8B3;font-size:14px;line-height:1.6">
          <strong style="color:#FFBF00">${escapeHtml(input.fullName)}</strong> just completed the pilot quiz.
          Result: <span style="color:${outcomeColor};font-weight:700">${outcomeLabel}</span>
        </p>
      </td></tr>

      <tr><td style="padding:20px 28px 0">
        <div style="font-size:9.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6E7681;padding:6px 0;border-bottom:1px solid #222831;margin-bottom:10px;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">
          <span style="color:#FFBF00;margin-right:8px">01</span>CONTACT
        </div>
        <table cellpadding="0" cellspacing="0" width="100%">
          ${row('Name', escapeHtml(input.fullName))}
          ${row('Email', `<a href="mailto:${escapeHtml(input.email)}" style="color:#5FA0FF;text-decoration:none">${escapeHtml(input.email)}</a>`)}
          ${row('Outcome', `<span style="color:${outcomeColor};font-weight:700">${outcomeLabel}</span>`)}
        </table>
      </td></tr>

      <tr><td style="padding:20px 28px 0">
        <div style="font-size:9.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6E7681;padding:6px 0;border-bottom:1px solid #222831;margin-bottom:10px;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">
          <span style="color:#FFBF00;margin-right:8px">02</span>QUIZ ANSWERS
        </div>
        <table cellpadding="0" cellspacing="0" width="100%">
          ${answerRows}
        </table>
      </td></tr>

      <tr><td style="padding:24px 28px 8px">
        <a href="https://app.merlinflighttraining.com/admin" style="display:inline-block;background:#FFBF00;color:#0B0B0B;text-decoration:none;font-weight:700;padding:12px 20px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">◉ View in admin →</a>
        &nbsp;&nbsp;
        <a href="mailto:${escapeHtml(input.email)}" style="display:inline-block;background:rgba(255,255,255,0.07);color:#E6E9ED;text-decoration:none;font-weight:700;padding:12px 20px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;border:1px solid rgba(255,255,255,0.15)">Reply to lead →</a>
      </td></tr>

      <tr><td style="padding:16px 28px 24px">
        <p style="margin:0;font-size:10px;color:#6E7681;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace">
          Prospect ID · <span style="color:#A1A8B3">${escapeHtml(input.prospectId)}</span>
        </p>
      </td></tr>
    </table>`

  return {
    subject: `New quiz lead · ${input.fullName} · ${outcomeLabel}`,
    html: shell(`New quiz lead: ${input.fullName} · ${outcomeLabel}`, outcomeLabel, outcomeColor, body, true),
    text: [
      `Hey Isaac,`,
      ``,
      `${input.fullName} just completed the pilot quiz. Outcome: ${outcomeLabel}`,
      ``,
      `Email: ${input.email}`,
      ``,
      `QUIZ ANSWERS`,
      ...Object.entries(input.answers).map(([k, v]) => `  ${k}: ${ANSWER_LABELS[k]?.[v] ?? v}`),
      ``,
      `Prospect ID: ${input.prospectId}`,
    ].join('\n'),
  }
}
