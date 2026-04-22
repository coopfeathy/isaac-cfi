'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------
type IconProps = { size?: number; className?: string }

const HeartIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)
const PlaneIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </svg>
)
const UsersIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const MapPinIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const CameraIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
)
const StarIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const CheckIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const PhoneIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)
const MailIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------
const packages = [
  {
    name: 'Newlywed Escape',
    icon: HeartIcon,
    description: 'A private scenic flight just for the couple. Fly over your venue, your city, or wherever you choose — the perfect once-in-a-lifetime moment together.',
    highlights: [
      'Private 30-minute scenic flight for the couple',
      'Fly over your wedding venue from above',
      'Photo & video opportunity from the cockpit',
      'Certificate of flight for a keepsake',
    ],
  },
  {
    name: 'Wedding Party Experience',
    icon: UsersIcon,
    description: 'Give your bridal party or VIP guests the thrill of a discovery flight. Each guest gets their own time in the pilot seat — an unforgettable way to celebrate.',
    highlights: [
      'Up to 8 guest flights (15–20 min each)',
      'Each guest takes the controls with a CFI',
      'A private flight for the couple included',
      'Group photo opportunity on the ramp',
    ],
  },
  {
    name: 'Full-Day Sky Celebration',
    icon: StarIcon,
    description: 'The ultimate wedding entertainment. I\'ll be at your chosen airport all day, flying guests one at a time throughout the reception. Your wedding, in the sky.',
    highlights: [
      'Full-day availability (up to 8 hours)',
      'Unlimited guest flights throughout the day',
      'Priority flight for the couple',
      'Airport of your choice (we come to you)',
      'Custom flight certificates for every guest',
    ],
  },
]

// ---------------------------------------------------------------------------
// How It Works steps
// ---------------------------------------------------------------------------
const steps = [
  {
    num: '01',
    title: 'Get in Touch',
    description: 'Reach out with your wedding date, guest count, and preferred airport. We\'ll put together a custom quote.',
  },
  {
    num: '02',
    title: 'Choose Your Package',
    description: 'Pick from a couple\'s flight, a wedding-party experience, or a full-day sky celebration — or build something custom.',
  },
  {
    num: '03',
    title: 'We Handle the Details',
    description: 'Aircraft booking, weather planning, and safety briefings are all on us. You focus on your big day.',
  },
  {
    num: '04',
    title: 'Fly on Your Wedding Day',
    description: 'Your guests arrive at the airport, hop in the plane, and create memories they\'ll never forget.',
  },
]

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function WeddingsPage() {
  const [form, setForm] = useState({
    coupleName: '',
    email: '',
    phone: '',
    weddingDate: '',
    guestCount: '',
    preferredAirport: '',
    packageInterest: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
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
      const res = await fetch('/api/wedding-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch (err) {
      console.error('Wedding inquiry submit failed', err)
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* ---------------------------------------------------------------- */}
      {/* Hero — with background photo */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 overflow-hidden">
        {/* Hero background image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/our-aircraft-header.JPG"
            alt="Merlin Flight Training aircraft on the ramp"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-golden/10 border border-golden/30 text-golden text-xs sm:text-sm font-semibold tracking-wide uppercase mb-6">
            <HeartIcon size={14} />
            A Wedding Experience Like No Other
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Discovery Flight Weddings
            </span>
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            Give your wedding day a moment no one will ever forget. Hire a certified flight
            instructor to take you, your partner, and your guests on discovery flights at the
            airport of your choice — all day long.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#inquiry"
              className="min-h-[56px] inline-flex items-center justify-center px-8 py-4 text-base sm:text-lg bg-golden text-black font-bold rounded-lg shadow-lg hover:bg-yellow-500 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              Request a Custom Quote
            </a>
            <a
              href="#packages"
              className="min-h-[56px] inline-flex items-center justify-center px-8 py-4 text-base sm:text-lg bg-white/10 text-white font-semibold rounded-lg border border-golden/30 hover:bg-golden/10 transition-all duration-300"
            >
              View Packages
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* What Is It — with real photos */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-8 sm:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                  Your Wedding, in the Sky
                </span>
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Imagine your guests walking out to a real airplane on the ramp, climbing into the
                pilot seat, and soaring over the countryside with a certified flight instructor by
                their side. That&apos;s what Discovery Flight Weddings is all about.
              </p>
              <p className="text-gray-300 leading-relaxed">
                I&apos;ll bring the experience to you — at any airport you choose. Whether it&apos;s
                a quick scenic flight for the newlyweds or a full day of guest flights during
                cocktail hour and reception, this is wedding entertainment your guests have
                never seen before.
              </p>
            </div>

            {/* Feature badges with icons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              {[
                { icon: PlaneIcon, label: 'FAA-Certified Instructor' },
                { icon: MapPinIcon, label: 'Any Airport You Choose' },
                { icon: CameraIcon, label: 'Photo-Ready Moments' },
                { icon: HeartIcon, label: 'Unforgettable Memories' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white/5 border border-golden/10 rounded-xl p-4 text-center"
                >
                  <item.icon size={28} className="text-golden mx-auto mb-2" />
                  <p className="text-sm text-gray-300 font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Photo gallery strip */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { src: '/images/republic-airport.png', alt: 'Republic Airport — one of our home bases' },
              { src: '/images/n1624q-1.JPG', alt: 'Aircraft on the ramp ready for flights' },
              { src: '/images/flying-w-airport.png', alt: 'Flying W Airport — a scenic departure point' },
            ].map((photo) => (
              <div key={photo.src} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-golden/10 group">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <p className="absolute bottom-2 left-3 right-3 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">
                  {photo.alt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Packages */}
      {/* ---------------------------------------------------------------- */}
      <section id="packages" className="px-4 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                Choose Your Experience
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Every wedding is different. Pick a package that fits your vision, or reach out for
              something completely custom.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg, i) => (
              <div
                key={pkg.name}
                className={`relative bg-white/5 backdrop-blur-md border rounded-2xl p-6 sm:p-8 flex flex-col transition-all duration-300 hover:bg-white/[0.08] ${
                  i === 2
                    ? 'border-golden/50 ring-1 ring-golden/20'
                    : 'border-golden/20'
                }`}
              >
                {i === 2 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-golden text-black text-xs font-bold uppercase tracking-wider rounded-full">
                    Most Popular
                  </div>
                )}
                <pkg.icon size={32} className="text-golden mb-4" />
                <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-grow">
                  {pkg.description}
                </p>
                <ul className="space-y-2 mb-6">
                  {pkg.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckIcon size={16} className="text-golden mt-0.5 flex-shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#inquiry"
                  className={`mt-auto inline-flex items-center justify-center px-6 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
                    i === 2
                      ? 'bg-golden text-black hover:bg-yellow-500'
                      : 'bg-white/10 text-white border border-golden/30 hover:bg-golden/10'
                  }`}
                >
                  Get a Quote
                </a>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            All pricing is custom based on your wedding date, location, and guest count.
            Reach out and we&apos;ll put together a quote within 24 hours.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How It Works */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div
                key={step.num}
                className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-6 text-center"
              >
                <div className="text-3xl font-bold text-golden/30 mb-2">{step.num}</div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ-style reassurances */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                Good to Know
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                q: 'Is it safe?',
                a: 'Absolutely. Every flight is conducted by an FAA-certified flight instructor (CFII) in a properly maintained, inspected aircraft. Safety is always the top priority.',
              },
              {
                q: 'What if the weather is bad?',
                a: 'Weather is always the final call. If conditions aren\'t flyable on your wedding day, we\'ll work with you on a backup date or a refund — no questions asked.',
              },
              {
                q: 'Can guests really fly the plane?',
                a: 'Yes! On a discovery flight, your guests take the controls under the guidance of a certified instructor. No experience needed — that\'s the magic of it.',
              },
              {
                q: 'How far will you travel?',
                a: 'I\'ll come to any airport that works for your venue. We\'ll coordinate logistics so your guests can get to the airport and back seamlessly.',
              },
              {
                q: 'What about wedding attire?',
                a: 'Guests can absolutely fly in their wedding outfits. We just recommend closed-toe shoes for the rudder pedals. Veils and long trains might want to stay on the ground!',
              },
              {
                q: 'How many guests can fly in a day?',
                a: 'With a full-day booking, we can typically fly 15–25+ guests depending on flight length. We\'ll build a schedule that fits your reception timeline.',
              },
            ].map((item) => (
              <div
                key={item.q}
                className="bg-white/5 border border-golden/10 rounded-xl p-6"
              >
                <h3 className="text-base font-bold text-golden mb-2">{item.q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Full-width tagline banner */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative h-64 sm:h-80 overflow-hidden bg-gradient-to-r from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/70" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-golden text-lg sm:text-2xl font-bold mb-2 drop-shadow-lg">
              Your Guests. The Controls. The Sky.
            </p>
            <p className="text-gray-200 text-sm sm:text-base drop-shadow-lg max-w-lg mx-auto">
              Every guest gets to sit in the pilot seat and actually fly the airplane — no experience required.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Inquiry Form */}
      {/* ---------------------------------------------------------------- */}
      <section id="inquiry" className="px-4 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-8 sm:p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                  Request Your Custom Quote
                </span>
              </h2>
              <p className="text-gray-400 text-sm">
                Tell us about your wedding and we&apos;ll get back to you within 24 hours with a
                personalized quote.
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <HeartIcon size={48} className="text-golden mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">We Got Your Inquiry!</h3>
                <p className="text-gray-400">
                  Thank you! Isaac will review your details and reach out within 24 hours with a
                  custom quote. Congratulations on the upcoming wedding!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="coupleName" className="block text-sm font-medium text-gray-300 mb-1">
                      Couple&apos;s Names *
                    </label>
                    <input
                      type="text"
                      id="coupleName"
                      name="coupleName"
                      required
                      value={form.coupleName}
                      onChange={handleChange}
                      placeholder="e.g. Sarah & James"
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="weddingDate" className="block text-sm font-medium text-gray-300 mb-1">
                      Wedding Date *
                    </label>
                    <input
                      type="date"
                      id="weddingDate"
                      name="weddingDate"
                      required
                      value={form.weddingDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="guestCount" className="block text-sm font-medium text-gray-300 mb-1">
                      Estimated Guest Flights
                    </label>
                    <select
                      id="guestCount"
                      name="guestCount"
                      value={form.guestCount}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all"
                    >
                      <option value="" className="bg-gray-900">Select...</option>
                      <option value="couple-only" className="bg-gray-900">Just the couple</option>
                      <option value="2-5" className="bg-gray-900">2–5 guests</option>
                      <option value="6-10" className="bg-gray-900">6–10 guests</option>
                      <option value="11-20" className="bg-gray-900">11–20 guests</option>
                      <option value="20+" className="bg-gray-900">20+ guests</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="preferredAirport" className="block text-sm font-medium text-gray-300 mb-1">
                      Preferred Airport
                    </label>
                    <input
                      type="text"
                      id="preferredAirport"
                      name="preferredAirport"
                      value={form.preferredAirport}
                      onChange={handleChange}
                      placeholder="e.g. KFUL or nearest to venue"
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="packageInterest" className="block text-sm font-medium text-gray-300 mb-1">
                    Package Interest
                  </label>
                  <select
                    id="packageInterest"
                    name="packageInterest"
                    value={form.packageInterest}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all"
                  >
                    <option value="" className="bg-gray-900">Select a package...</option>
                    <option value="newlywed-escape" className="bg-gray-900">Newlywed Escape (couple only)</option>
                    <option value="wedding-party" className="bg-gray-900">Wedding Party Experience</option>
                    <option value="full-day" className="bg-gray-900">Full-Day Sky Celebration</option>
                    <option value="custom" className="bg-gray-900">Something custom</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                    Anything Else?
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us about your wedding vision, venue location, or any questions..."
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all resize-none"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[56px] inline-flex items-center justify-center px-8 py-4 text-base sm:text-lg bg-golden text-black font-bold rounded-lg shadow-lg hover:bg-yellow-500 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {submitting ? 'Sending...' : 'Send My Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Direct contact */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-4 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-400 text-sm mb-4">
            Prefer to reach out directly? We&apos;d love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+18014550977"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-golden/20 rounded-lg text-gray-300 hover:bg-golden/10 hover:text-white transition-all text-sm"
            >
              <PhoneIcon size={16} className="text-golden" />
              (801) 455-0977
            </a>
            <a
              href="mailto:isaac@merlinflighttraining.com?subject=Wedding%20Discovery%20Flights"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-golden/20 rounded-lg text-gray-300 hover:bg-golden/10 hover:text-white transition-all text-sm"
            >
              <MailIcon size={16} className="text-golden" />
              isaac@merlinflighttraining.com
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
