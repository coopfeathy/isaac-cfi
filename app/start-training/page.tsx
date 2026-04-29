'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
// In-house scheduler replaces the old Calendly integration. All "book a lesson"
// CTAs now route to /book-lesson, a fully custom Apple Calendar–style picker.

// ---------------------------------------------------------------------------
// Inline SVG icons — we avoid importing most icons from lucide-react because
// the project is pinned to an older version that does not ship every icon we
// want. Inline SVGs keep the bundle small and eliminate the dependency risk.
// ---------------------------------------------------------------------------
type IconProps = { size?: number; className?: string }

const ShieldCheckIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)
const StethoscopeIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </svg>
)
const FileTextIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
)
const ClipboardListIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
)
const PlaneIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </svg>
)
const CheckCircleIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const CircleEmptyIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
  </svg>
)
const ExternalLinkIcon = ({ size = 14, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

// ---------------------------------------------------------------------------
// Requirements data — the four things a new student must handle before flying.
// ---------------------------------------------------------------------------
const requirements = [
  {
    id: 'tsa',
    title: 'TSA Citizenship Verification',
    icon: ShieldCheckIcon,
    summary:
      'Federal law requires every flight school to verify citizenship before training begins.',
    steps: [
      'US citizens: bring an unexpired US passport OR a birth certificate + government photo ID.',
      'Non-US citizens: apply through the TSA Flight Training Security Program (FTSP) before your first lesson.',
      'Your instructor will make a copy on your first ground session and keep it in your student file.',
    ],
    cta: {
      label: 'TSA FTSP Portal',
      href: 'https://www.fts.tsa.dhs.gov/',
    },
  },
  {
    id: 'medical',
    title: 'FAA Medical Certificate (Class 3)',
    icon: StethoscopeIcon,
    summary:
      'A Third-Class Medical from an FAA-designated Aviation Medical Examiner (AME) is required before your first solo.',
    steps: [
      'Create a MedXPress account at medxpress.faa.gov and fill out the application.',
      'Find a local AME using the FAA AME locator and book a 30-minute exam.',
      'Bring your MedXPress confirmation number and a photo ID to the appointment.',
      'You can start training before the exam, but you must have the medical in hand before your first solo flight.',
    ],
    cta: {
      label: 'Find an AME',
      href: 'https://www.faa.gov/pilots/amelocator',
    },
  },
  {
    id: 'student-cert',
    title: 'Student Pilot Certificate (IACRA)',
    icon: FileTextIcon,
    summary:
      'This is your official FAA student pilot certificate — apply online through IACRA before your first solo.',
    steps: [
      'Register for an IACRA account at iacra.faa.gov.',
      'Complete FAA Form 8710-1 under "Student Pilot Certificate".',
      'Your instructor (CFI) will review and sign off your application.',
      'The TSA will run a background check; the plastic card arrives in the mail in 3–6 weeks.',
    ],
    cta: {
      label: 'IACRA Login',
      href: 'https://iacra.faa.gov/',
    },
  },
  {
    id: 'enrollment',
    title: 'Enrollment Paperwork + Deposit',
    icon: ClipboardListIcon,
    summary:
      'Sign our student enrollment agreement, liability waiver, and put down your refundable training deposit.',
    steps: [
      'We\'ll email you the Merlin Flight Training enrollment packet — it takes about 10 minutes to e-sign.',
      'Pay a refundable $500 training deposit to reserve your recurring lesson slot.',
      'Upload a government-issued photo ID to your student account.',
      'Once these are complete you\'ll be marked "Approved to Train" and can start booking lessons on your dashboard.',
    ],
    cta: {
      label: 'Begin Onboarding',
      href: '/onboarding',
    },
  },
] as const

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function StartTrainingContent() {
  const searchParams = useSearchParams()
  const prefillEmail = searchParams?.get('email') ?? ''

  const [checked, setChecked] = useState<Record<string, boolean>>({
    tsa: false,
    medical: false,
    'student-cert': false,
    enrollment: false,
  })

  const [form, setForm] = useState({
    email: prefillEmail,
    fullName: '',
    phone: '',
    preferredLocation: '',
    earliestStart: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const completedCount = Object.values(checked).filter(Boolean).length
  const progress = (completedCount / requirements.length) * 100

  const handleToggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/start-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          requirementsChecklist: checked,
        }),
      })

      if (!response.ok) {
        let message = 'Something went wrong. Please try again.'
        try {
          const data = await response.json()
          message = data.error || message
        } catch {
          message = `Server error: ${response.status} ${response.statusText}`
        }
        setError(message)
        setSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch (err) {
      console.error('Start training submit failed', err)
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-golden/10 border border-golden/30 text-golden text-xs sm:text-sm font-semibold tracking-wide uppercase mb-6">
            <PlaneIcon size={14} />
            You&apos;ve flown with us — let&apos;s make it official
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Start Your Flight Training
            </span>
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            Your discovery flight proved what you already suspected — you belong in the air. Here&apos;s
            exactly what happens next. Book your first real lesson, and we&apos;ll walk you through the
            four FAA requirements side-by-side.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://app.merlinflighttraining.com/book-lesson"
              className="min-h-[56px] inline-flex items-center justify-center px-8 py-4 text-base sm:text-lg bg-golden text-black font-bold rounded-lg shadow-lg hover:bg-yellow-500 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              Book My First Lesson →
            </Link>
            <Link
              href="#requirements"
              className="min-h-[56px] inline-flex items-center justify-center px-8 py-4 bg-transparent text-white border-2 border-white/30 hover:border-golden hover:bg-white/10 backdrop-blur-sm font-semibold rounded-lg transition-all duration-300"
            >
              See What&apos;s Required
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Progress bar */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 pb-8" id="requirements">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-lg">Your Pre-Training Checklist</h2>
              <span className="text-golden font-bold">
                {completedCount} / {requirements.length}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden mb-4">
              <div
                className="bg-gradient-to-r from-golden via-yellow-400 to-golden h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm">
              Check items off as you complete them. None of this has to be done before your first
              lesson — but all of it must be done before your first solo.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Requirements */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto space-y-4">
          {requirements.map((req, idx) => {
            const Icon = req.icon
            const isChecked = checked[req.id]
            const isInternalLink = req.cta.href.startsWith('/')
            return (
              <div
                key={req.id}
                className={`bg-white/5 backdrop-blur-md border rounded-2xl p-6 sm:p-8 transition-all duration-300 ${
                  isChecked ? 'border-golden/60 shadow-lg shadow-golden/10' : 'border-golden/20'
                }`}
              >
                <div className="flex items-start gap-4 sm:gap-6">
                  {/* Step icon + number */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isChecked ? 'bg-golden text-black' : 'bg-golden/10 text-golden'
                      }`}
                    >
                      <Icon size={24} />
                    </div>
                    <div className="text-center text-xs text-gray-500 font-mono mt-2">
                      Step {idx + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-xl sm:text-2xl font-bold text-white">{req.title}</h3>
                      <button
                        type="button"
                        onClick={() => handleToggle(req.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-golden transition-colors"
                        aria-label={isChecked ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {isChecked ? (
                          <CheckCircleIcon size={28} className="text-golden" />
                        ) : (
                          <CircleEmptyIcon size={28} />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-300 leading-relaxed mb-4">{req.summary}</p>
                    <ol className="space-y-2 mb-5 text-gray-400 text-sm sm:text-base">
                      {req.steps.map((step, stepIdx) => (
                        <li key={stepIdx} className="flex gap-3">
                          <span className="text-golden font-bold flex-shrink-0">
                            {stepIdx + 1}.
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                    {isInternalLink ? (
                      <Link
                        href={req.cta.href}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-golden/10 border border-golden/40 text-golden hover:bg-golden hover:text-black font-semibold rounded-lg transition-all duration-300 text-sm"
                      >
                        {req.cta.label}
                        <ExternalLinkIcon size={14} />
                      </Link>
                    ) : (
                      <a
                        href={req.cta.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-golden/10 border border-golden/40 text-golden hover:bg-golden hover:text-black font-semibold rounded-lg transition-all duration-300 text-sm"
                      >
                        {req.cta.label}
                        <ExternalLinkIcon size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Intake form — commits the prospect to "start training" */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/5 backdrop-blur-md border border-golden/30 rounded-2xl p-6 sm:p-10 shadow-2xl">
            {submitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-golden/20 border border-golden/40 mb-6">
                  <CheckCircleIcon size={32} className="text-golden" />
                </div>
                <h2 className="text-3xl font-bold mb-3">
                  <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                    You&apos;re in — welcome to the flight school.
                  </span>
                </h2>
                <p className="text-gray-300 text-lg mb-6">
                  We just sent a confirmation email with your onboarding links. Your instructor will
                  reach out within one business day to lock in your first lesson.
                </p>
                <Link
                  href="https://app.merlinflighttraining.com/book-lesson"
                  className="min-h-[52px] inline-flex items-center justify-center px-8 py-3 bg-golden text-black font-bold rounded-lg shadow-lg hover:bg-yellow-500 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                >
                  Book My First Lesson Now
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                    <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                      Lock In Your Training Slot
                    </span>
                  </h2>
                  <p className="text-gray-400">
                    Fill this out and we&apos;ll hold a recurring lesson slot for you.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullName" className="block text-white text-sm font-semibold mb-2">
                      Full name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-white text-sm font-semibold mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                      placeholder="you@email.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-white text-sm font-semibold mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="preferredLocation"
                      className="block text-white text-sm font-semibold mb-2"
                    >
                      Training location
                    </label>
                    <select
                      id="preferredLocation"
                      name="preferredLocation"
                      value={form.preferredLocation}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                    >
                      <option value="" className="bg-gray-900">
                        Select a location
                      </option>
                      <option value="long-island" className="bg-gray-900">
                        Long Island, NY (FRG)
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="earliestStart"
                    className="block text-white text-sm font-semibold mb-2"
                  >
                    When do you want to fly your first lesson?
                  </label>
                  <input
                    type="date"
                    id="earliestStart"
                    name="earliestStart"
                    value={form.earliestStart}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-white text-sm font-semibold mb-2">
                    Anything we should know? (optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                    placeholder="Scheduling preferences, questions about financing, career goals..."
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex gap-3">
                    <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 min-h-[56px] px-8 py-4 bg-golden text-black text-base sm:text-lg font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    {submitting ? 'Saving…' : 'Start My Training'}
                  </button>
                  <Link
                    href="https://app.merlinflighttraining.com/book-lesson"
                    className="flex-1 min-h-[56px] inline-flex items-center justify-center px-8 py-4 bg-transparent text-white border-2 border-golden/50 hover:border-golden hover:bg-golden/10 font-semibold rounded-lg transition-all duration-300"
                  >
                    Or: Book Lesson on Calendar
                  </Link>
                </div>

                <p className="text-center text-gray-500 text-xs">
                  By clicking Start My Training, you agree to be contacted by a Merlin flight
                  instructor and to receive onboarding emails.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function StartTrainingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-golden animate-pulse">Loading…</div>
        </div>
      }
    >
      <StartTrainingContent />
    </Suspense>
  )
}
