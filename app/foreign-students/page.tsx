'use client'

import Link from 'next/link'
import { useState } from 'react'

// ---------------------------------------------------------------------------
// Inline SVG icons — matches the approach used elsewhere on the site so we
// don't depend on a specific lucide-react version.
// ---------------------------------------------------------------------------
type IconProps = { size?: number; className?: string }

const GlobeIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const ShieldCheckIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

const PassportIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="10" r="3" />
    <path d="M8 18h8" />
  </svg>
)

const FingerprintIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 11c0 5-1 7-1 7" />
    <path d="M16 11c0 4-1 6-2 9" />
    <path d="M8 11c0 5 1 7 1 7" />
    <path d="M6 16c0-4 0-7 6-7s6 3 6 7" />
    <path d="M4 12a8 8 0 0 1 16 0" />
    <path d="M4 16v.5" />
  </svg>
)

const PlaneIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </svg>
)

const EnvelopeIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </svg>
)

const CheckIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const ChevronIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
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
// Data
// ---------------------------------------------------------------------------

const steps = [
  {
    title: 'Contact Us First',
    summary:
      'Send us a short message with your country of citizenship and the type of training you want (Private Pilot, Instrument, Commercial, etc.). We will reply within one business day in plain, simple English and tell you exactly what your situation requires.',
    detail:
      'We do this step first — before you pay any fees — so there are no surprises. Every country is a little different, and we want to make sure the path ahead of you is realistic.',
  },
  {
    title: 'Register with the TSA (AFSP)',
    summary:
      'Every non-US citizen who wants to train for a US pilot certificate must be approved by the Transportation Security Administration (TSA) through the Alien Flight Student Program (AFSP). You create your student account at flightschoolcandidates.gov.',
    detail:
      'Good news: Merlin Flight Training is already registered with the TSA AFSP portal as a provider. That means when you list us as your flight school, we can confirm your training request right away — you don\'t have to wait for us to register.',
  },
  {
    title: 'Submit Your Documents & Fees to TSA',
    summary:
      'Inside your AFSP account you will upload your passport, a recent photo, and details about the training you are requesting. You pay the TSA processing fee directly to the TSA (not to us).',
    detail:
      'For most training at Merlin (small single-engine aircraft, under 12,500 lbs), you fall into "Category 3". Category 3 students typically do NOT need to travel to the US just to get fingerprinted — we will confirm the current rules with you in writing before you start.',
  },
  {
    title: 'Wait for TSA Approval',
    summary:
      'TSA reviews your application. Category 3 approvals are often faster than Category 1 or 2. We recommend you do not book flights to the US until your TSA approval is in hand.',
    detail:
      'While you wait, you can start studying for the FAA written exam, get your FAA medical scheduled, and line up your housing. We will send you a reading list so the waiting time is not wasted.',
  },
  {
    title: 'Arrive and Start Flying',
    summary:
      'Once TSA has cleared you, fly to the US, check in with us in person, bring your original passport and TSA approval letter, and we will begin training. Your first flight lesson can usually happen within a few days of arrival.',
    detail:
      'We will help you with ground school scheduling, aircraft rental, and checkride prep. Most international Private Pilot students finish in 2–4 months of focused training.',
  },
] as const

const documents = [
  'Valid passport (must be valid for the full length of your training)',
  'A clear digital passport-style photo for your AFSP account',
  'Proof of the training you are requesting (we provide this letter)',
  'FAA Medical Certificate — usually Class 3 for Private Pilot',
  'Proof of English language proficiency (ICAO Level 4 or higher)',
  'Your entry visa or ESTA authorization (we will help you confirm the correct type for your situation)',
] as const

const faqs = [
  {
    q: 'Do I have to speak perfect English?',
    a: 'No — but the FAA requires pilots to read, speak, write and understand English well enough to be safe in the US airspace system (ICAO Level 4). If you can hold a normal conversation in English, you will be fine. We are patient with students whose first language is not English, and we slow down when we need to.',
  },
  {
    q: 'How long will the TSA approval take?',
    a: 'It varies. Category 3 applications (small aircraft training — which is what most new students do) are usually the fastest. We recommend starting your TSA application at least 60 days before you want to arrive in the US, just to be safe.',
  },
  {
    q: 'Do I need to travel to the US just to get fingerprinted?',
    a: 'For Category 3 training (aircraft under 12,500 lbs, which covers Private, Instrument and most Commercial training at Merlin), fingerprinting requirements are limited. We will confirm your specific requirement in writing before you buy any plane tickets.',
  },
  {
    q: 'What kind of visa do I need?',
    a: 'This depends on why you are training. Vocational / career pilot training generally requires an M-1 visa from a SEVIS-certified school. Recreational or discovery flying can sometimes be done on a B visa or ESTA, depending on your situation. We will talk through your specific case before you apply — please do not assume and please do not make travel plans until we confirm.',
  },
  {
    q: 'Can I convert my foreign pilot license to an FAA license?',
    a: 'Yes, in most cases. If you already hold an ICAO-recognized pilot license, the FAA has a license conversion process. You will still need TSA approval before training, but the path is shorter than starting from zero. Contact us and tell us which license you hold.',
  },
  {
    q: 'How much does it cost?',
    a: 'Our training rates are the same for international and US students. See our training-options page for full pricing. The only additional costs you will pay as an international student are the TSA processing fee, your visa fee (if applicable), and your travel to the US.',
  },
] as const

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ForeignStudentsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    country: '',
    currentLicense: '',
    desiredTraining: 'Private Pilot',
    englishLevel: '',
    earliestStart: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // No dedicated API route for international inquiries yet — open the
    // student's email client with a prefilled draft addressed to the school.
    const subject = encodeURIComponent(
      `International Flight Training Inquiry — ${form.fullName || 'New Student'}`,
    )
    const body = encodeURIComponent(
      `Hi Merlin Flight Training,\n\n` +
        `I am interested in flight training at your school as an international student.\n\n` +
        `Full name: ${form.fullName}\n` +
        `Country of citizenship: ${form.country}\n` +
        `Email: ${form.email}\n` +
        `Current pilot license (if any): ${form.currentLicense || 'None'}\n` +
        `Training I want: ${form.desiredTraining}\n` +
        `English level: ${form.englishLevel}\n` +
        `Earliest I could start: ${form.earliestStart}\n\n` +
        `Additional notes:\n${form.message}\n\n` +
        `Thank you.`,
    )
    window.location.href = `mailto:isaac.imp.prestwich@gmail.com?subject=${subject}&body=${body}`
    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-golden/10 border border-golden/30 text-golden text-xs sm:text-sm font-semibold tracking-wide uppercase mb-6">
            <GlobeIcon size={14} />
            International Students Welcome
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Learn to Fly in the United States
            </span>
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-8">
            Yes — we train foreign students. Merlin Flight Training is registered
            with the TSA Alien Flight Student Program (AFSP) portal, so we can
            accept your application and process your training request directly.
          </p>

          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-golden/30 mb-10">
            <ShieldCheckIcon size={22} className="text-golden" />
            <span className="text-white font-semibold text-sm sm:text-base">
              TSA AFSP Portal Provider — Approved to Train International Students
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#contact"
              className="min-h-[56px] inline-flex items-center justify-center px-8 py-4 bg-golden text-black text-base sm:text-lg font-bold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-[1.02]"
            >
              Contact Me About Training →
            </Link>
            <Link
              href="#how-it-works"
              className="min-h-[56px] inline-flex items-center justify-center px-8 py-4 bg-transparent text-white border-2 border-white/30 hover:border-golden hover:bg-white/10 backdrop-blur-sm font-semibold rounded-lg transition-all duration-300"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Reassurance / what to expect */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-6 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-white">
              You are in the right place.
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Training in a foreign country can feel overwhelming. There are government forms,
              visa questions, exams in a second language, and an ocean between you and your
              flight school. We understand. Hundreds of international pilots have earned their
              FAA certificates at schools just like ours, and we have built this page to make
              your path as clear as possible.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Our promise to you is simple: we will answer your questions in plain English, we
              will tell you honestly what your situation requires, and we will never ask you to
              spend money on travel or fees until we are confident you are cleared to train with
              us.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How it works — 5 steps */}
      {/* ------------------------------------------------------------------ */}
      <section id="how-it-works" className="px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                Your Path in 5 Steps
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From your first email to your first flight lesson — here is the exact order things
              happen.
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-6 sm:p-8"
              >
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center bg-golden text-black font-bold text-xl sm:text-2xl">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed mb-3">{step.summary}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Documents */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-6 sm:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-golden/10 text-golden flex items-center justify-center">
                <PassportIcon size={24} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">What You Will Need</h2>
            </div>
            <p className="text-gray-300 leading-relaxed mb-6">
              Gather digital copies of these items before you start your TSA AFSP application. If
              you are missing something, tell us — most things can be handled in parallel with
              your application.
            </p>
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li key={doc} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-golden/20 text-golden flex items-center justify-center mt-0.5">
                    <CheckIcon size={14} />
                  </div>
                  <span className="text-gray-300 leading-relaxed">{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* External links */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 pb-12">
        <div className="max-w-4xl mx-auto grid gap-4 sm:grid-cols-2">
          <a
            href="https://www.fts.tsa.dhs.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/5 backdrop-blur-md border border-golden/20 hover:border-golden rounded-2xl p-6 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheckIcon size={28} className="text-golden" />
              <h3 className="text-lg font-bold text-white group-hover:text-golden transition-colors">
                TSA Flight Training Security Program
              </h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Official TSA portal where you create your AFSP student account and submit your
              training request.
            </p>
            <span className="inline-flex items-center gap-2 text-golden text-sm font-semibold">
              Open TSA Portal <ExternalLinkIcon size={14} />
            </span>
          </a>

          <a
            href="https://www.faa.gov/pilots/amelocator"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/5 backdrop-blur-md border border-golden/20 hover:border-golden rounded-2xl p-6 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3 mb-3">
              <FingerprintIcon size={28} className="text-golden" />
              <h3 className="text-lg font-bold text-white group-hover:text-golden transition-colors">
                FAA Medical Examiner Locator
              </h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Find an FAA-designated Aviation Medical Examiner (AME) once you arrive in the US to
              complete your medical certificate.
            </p>
            <span className="inline-flex items-center gap-2 text-golden text-sm font-semibold">
              Find an AME <ExternalLinkIcon size={14} />
            </span>
          </a>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                Common Questions
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={faq.q}
                  className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="text-base sm:text-lg font-semibold text-white">
                      {faq.q}
                    </span>
                    <ChevronIcon
                      size={20}
                      className={`text-golden flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-gray-300 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Contact form */}
      {/* ------------------------------------------------------------------ */}
      <section id="contact" className="px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/5 backdrop-blur-md border border-golden/30 rounded-2xl p-6 sm:p-10 shadow-2xl">
            {submitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-golden/20 border border-golden/40 mb-6">
                  <EnvelopeIcon size={32} className="text-golden" />
                </div>
                <h2 className="text-3xl font-bold mb-3">
                  <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                    Message Ready to Send
                  </span>
                </h2>
                <p className="text-gray-300 text-lg mb-3">
                  Your email app should have just opened with a prefilled message. Send it and
                  we will reply within one business day.
                </p>
                <p className="text-gray-500 text-sm">
                  If nothing opened, email us directly at{' '}
                  <a
                    className="text-golden underline"
                    href="mailto:isaac.imp.prestwich@gmail.com"
                  >
                    isaac.imp.prestwich@gmail.com
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                    <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                      Start the Conversation
                    </span>
                  </h2>
                  <p className="text-gray-400">
                    Tell us a little about yourself and we will reply with a clear plan for your
                    training.
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
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                      placeholder="Your full legal name (as on passport)"
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
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                      placeholder="you@email.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-white text-sm font-semibold mb-2">
                      Country of citizenship
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                      placeholder="e.g. Brazil, Germany, India…"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="currentLicense"
                      className="block text-white text-sm font-semibold mb-2"
                    >
                      Current pilot license (if any)
                    </label>
                    <input
                      type="text"
                      id="currentLicense"
                      name="currentLicense"
                      value={form.currentLicense}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                      placeholder="e.g. EASA PPL, CPL, or 'none'"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="desiredTraining"
                      className="block text-white text-sm font-semibold mb-2"
                    >
                      Training I want
                    </label>
                    <select
                      id="desiredTraining"
                      name="desiredTraining"
                      value={form.desiredTraining}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                    >
                      <option className="bg-gray-900" value="Private Pilot">
                        Private Pilot (PPL)
                      </option>
                      <option className="bg-gray-900" value="Instrument Rating">
                        Instrument Rating (IR)
                      </option>
                      <option className="bg-gray-900" value="Commercial Pilot">
                        Commercial Pilot (CPL)
                      </option>
                      <option className="bg-gray-900" value="License Conversion">
                        Foreign License Conversion
                      </option>
                      <option className="bg-gray-900" value="Discovery Flight">
                        Discovery Flight / Just curious
                      </option>
                      <option className="bg-gray-900" value="Other">
                        Other / Not sure yet
                      </option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="englishLevel"
                      className="block text-white text-sm font-semibold mb-2"
                    >
                      English comfort level
                    </label>
                    <select
                      id="englishLevel"
                      name="englishLevel"
                      value={form.englishLevel}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                    >
                      <option className="bg-gray-900" value="">
                        Select one
                      </option>
                      <option className="bg-gray-900" value="Native / fluent">
                        Native / fluent
                      </option>
                      <option className="bg-gray-900" value="Comfortable in conversation">
                        Comfortable in conversation
                      </option>
                      <option className="bg-gray-900" value="Working on it">
                        Working on it
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="earliestStart"
                    className="block text-white text-sm font-semibold mb-2"
                  >
                    Earliest I could travel to the US to start
                  </label>
                  <input
                    type="date"
                    id="earliestStart"
                    name="earliestStart"
                    value={form.earliestStart}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-white text-sm font-semibold mb-2">
                    Your questions or notes
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent"
                    placeholder="Visa questions, timing, career goals, anything you want us to know..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[56px] px-8 py-4 bg-golden text-black text-base sm:text-lg font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] inline-flex items-center justify-center gap-2"
                >
                  <EnvelopeIcon size={20} />
                  {submitting ? 'Preparing…' : 'Send Inquiry'}
                </button>

                <p className="text-center text-gray-500 text-xs">
                  This opens your email app with a prefilled message. We typically reply within
                  one business day.
                </p>
              </form>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-golden text-sm transition-colors"
            >
              <PlaneIcon size={16} />
              Back to Merlin Flight Training home
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
