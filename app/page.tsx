'use client'

import React, { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import TypingEffect from "@/app/components/TypingEffect"
import { CTA_EXPERIMENT_VARIANTS } from "@/lib/cta-experiment"
import {
  getAssignedCtaVariant,
  hasTrackedCtaViewThisSession,
  markCtaViewTrackedThisSession,
  trackCtaExperimentEvent,
} from "@/lib/cta-experiment-client"

type LiveGoogleReview = {
  authorName: string
  authorUrl: string | null
  rating: number
  relativeTime: string
  text: string
}

const fallbackReviewQuotes = [
  'Isaac makes learning to fly feel safe, clear, and exciting.',
  'Professional, patient, and exactly the kind of instructor you want.',
  'A great first step into aviation with real confidence.',
]

function shortenReviewQuote(text: string) {
  const cleanText = text.replace(/\s+/g, ' ').replace(/^["']|["']$/g, '').trim()

  if (cleanText.length <= 54) {
    return cleanText
  }

  const shortened = cleanText.slice(0, 51)
  const lastSpace = shortened.lastIndexOf(' ')

  return `${shortened.slice(0, lastSpace > 32 ? lastSpace : 51)}...`
}

export default function Home() {
  const [reviews, setReviews] = useState<LiveGoogleReview[]>([])
  const [reviewSummary, setReviewSummary] = useState<{ rating: number; userRatingCount: number } | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [activeReviewQuoteIndex, setActiveReviewQuoteIndex] = useState(0)
  const [heroCtaVariant, setHeroCtaVariant] = useState(CTA_EXPERIMENT_VARIANTS[0])

  useEffect(() => {
    let cancelled = false

    const fetchReviews = async () => {
      try {
        setReviewsLoading(true)
        const response = await fetch('/api/google-reviews')
        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(result?.error || 'Unable to load live Google reviews')
        }

        if (!cancelled) {
          setReviews(Array.isArray(result.reviews) ? result.reviews : [])
          setReviewSummary({
            rating: Number(result.rating || 0),
            userRatingCount: Number(result.userRatingCount || 0),
          })
          setReviewsError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setReviewsError(error instanceof Error ? error.message : 'Unable to load reviews right now')
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false)
        }
      }
    }

    fetchReviews()

    return () => {
      cancelled = true
    }
  }, [])

  const reviewQuotes = reviews
    .map((review) => review.text)
    .filter((text): text is string => Boolean(text && text.trim()))
    .map(shortenReviewQuote)
    .slice(0, 6)
  const rotatingReviewQuotes = reviewQuotes.length > 0 ? reviewQuotes : fallbackReviewQuotes
  const activeReviewQuote = rotatingReviewQuotes[activeReviewQuoteIndex % rotatingReviewQuotes.length]

  useEffect(() => {
    setActiveReviewQuoteIndex(0)
  }, [rotatingReviewQuotes.length])

  useEffect(() => {
    if (rotatingReviewQuotes.length <= 1) {
      return
    }

    const intervalId = window.setInterval(() => {
      setActiveReviewQuoteIndex((currentIndex) => (currentIndex + 1) % rotatingReviewQuotes.length)
    }, 4500)

    return () => window.clearInterval(intervalId)
  }, [rotatingReviewQuotes.length])

  useEffect(() => {
    const assignedVariant = getAssignedCtaVariant()
    setHeroCtaVariant(assignedVariant)

    if (!hasTrackedCtaViewThisSession()) {
      markCtaViewTrackedThisSession()
      trackCtaExperimentEvent('cta_viewed', assignedVariant, {
        placement: 'homepage_hero_primary',
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center bg-black overflow-hidden">
        {/* Mobile hero video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/images/golden-hour-skyline-flight.png"
          className="md:hidden absolute inset-0 w-full h-full object-cover"
        >
          <source src="/flightTakeoffMobile.mp4" type="video/mp4" />
        </video>
        {/* Desktop / tablet hero video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/images/golden-hour-skyline-flight.png"
          className="hidden md:block absolute inset-0 w-full h-full object-cover"
        >
          <source src="/flightTakeoff.mov" type="video/quicktime" />
          <source src="/flightTakeoff.mov" type="video/mp4" />
        </video>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60" />
        
        <div className="relative z-10 min-h-[85vh] sm:min-h-[90vh] w-full px-4 sm:px-6">
          <div className="mx-auto flex min-h-[85vh] sm:min-h-[90vh] max-w-6xl flex-col items-center justify-start pt-16 sm:pt-20 md:pt-24 pb-72 text-center text-white">
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[7.5rem] font-bold mb-6 sm:mb-8 tracking-tight">
              <div className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent leading-none mb-2">
                <TypingEffect
                  words={['Merlin', 'Tailored', 'One - on - One', 'Career', 'Private Pilot', 'Instrument Pilot', 'Commercial Pilot']}
                  wordPauseDuration={{ 0: 1800 }}
                />
              </div>
              <div className="text-white leading-none">Flight Training</div>
            </h1>
          </div>

          <div
            style={{
              position: 'absolute',
              left: '1rem',
              right: '1rem',
              bottom: 'clamp(2rem, 6vh, 3rem)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              zIndex: 20,
            }}
          >
            {/* Social proof badge */}
            <div className="flex w-full justify-center">
              <div className="w-full max-w-[22rem] rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-sm sm:max-w-2xl sm:px-5 sm:text-sm">
                <div className="flex items-center justify-center gap-2">
                  <span className="shrink-0 text-golden">★★★★★</span>
                  <span>5.0 Rating on Google</span>
                </div>
                <p className="mt-1 text-center italic leading-snug text-white/90">&ldquo;{activeReviewQuote}&rdquo;</p>
              </div>
            </div>
            <div className="flex w-full max-w-sm flex-col sm:max-w-none sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/discovery-flight-funnel"
                onClick={() => {
                  trackCtaExperimentEvent('cta_clicked', heroCtaVariant, {
                    placement: 'homepage_hero_primary',
                    destination: '/discovery-flight-funnel',
                  })
                }}
                className="group px-8 sm:px-10 py-3 sm:py-4 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-golden/50 text-base sm:text-lg relative overflow-hidden text-center w-full sm:w-auto"
              >
                <span className="relative z-10">{heroCtaVariant.label}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-golden opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link
                href="/pricing"
                className="px-8 sm:px-10 py-3 sm:py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-lg hover:bg-white/20 transition-all duration-300 text-base sm:text-lg text-center w-full sm:w-auto"
              >
                View Training & Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Training Paths */}
      <section className="bg-white py-14 sm:py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex flex-col gap-4 md:mb-14 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-golden">Choose your route</p>
              <h2 className="text-4xl font-black uppercase tracking-normal text-black sm:text-5xl md:text-6xl">
                Flight training built around your next certificate.
              </h2>
            </div>
            <p className="max-w-md text-base leading-relaxed text-gray-600 sm:text-lg">
              Start with a discovery flight, then move into focused one-on-one training at Northeast Philadelphia Airport.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Discovery Flight',
                copy: 'A first flight with a CFI so you can see if training feels right.',
                image: '/images/golden-hour-skyline-flight.png',
                href: '/discovery-flight-funnel',
              },
              {
                title: 'Private Pilot',
                copy: 'Structured lessons for the certificate that turns you into pilot in command.',
                image: '/images/n888ms-1.JPG',
                href: '/training-options',
              },
              {
                title: 'Instrument Rating',
                copy: 'Build confidence, precision, and weather decision-making after private pilot.',
                image: '/images/n1624q-2.JPG',
                href: '/training-options',
              },
              {
                title: 'Commercial Pilot',
                copy: 'Sharpen aircraft control and professional standards for the next step.',
                image: '/images/our-aircraft-header.JPG',
                href: '/training-options',
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group relative min-h-[24rem] overflow-hidden rounded-lg bg-black shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/5" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-golden">Merlin</p>
                  <h3 className="text-2xl font-black uppercase leading-none tracking-normal">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/85">{item.copy}</p>
                  <span className="mt-5 inline-flex text-sm font-bold uppercase italic text-golden">Explore training</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Training Flow */}
      <section className="bg-black py-16 text-white sm:py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-golden">How it works</p>
              <h2 className="text-4xl font-black uppercase leading-none tracking-normal sm:text-5xl md:text-6xl">
                Simple steps. Serious training.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
                The goal is to make the path feel clear before you spend money: pick the right starting point, understand the timeline, and train with a plan.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/discovery-flight-funnel"
                  className="rounded-lg bg-golden px-7 py-4 text-center font-bold text-black transition-colors hover:bg-yellow-500"
                >
                  Start My Free Training Plan
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-lg border border-white/25 px-7 py-4 text-center font-bold text-white transition-colors hover:bg-white/10"
                >
                  View Pricing
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['01', 'Pick your goal', 'Tell us whether you are brand new, returning to flying, or working toward a rating.'],
                ['02', 'Get a plan', 'We map the first steps, expected training path, and the right way to start.'],
                ['03', 'Fly at KPNE', 'Train one-on-one from Northeast Philadelphia Airport with practical local instruction.'],
              ].map(([number, title, copy]) => (
                <div key={number} className="rounded-lg border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
                  <p className="text-5xl font-black leading-none text-golden">{number}</p>
                  <h3 className="mt-6 text-xl font-black uppercase tracking-normal text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-300">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Proof + Reviews */}
      <section className="bg-white py-14 sm:py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-end">
            <div>
              <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-golden">Student proof</p>
              <h2 className="text-4xl font-black uppercase tracking-normal text-black sm:text-5xl md:text-6xl">Real reactions after flying.</h2>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-lg text-golden">★★★★★</span>
                <span className="font-black text-black">{reviewSummary ? reviewSummary.rating.toFixed(1) : '5.0'} on Google</span>
                {reviewSummary && <span className="text-sm text-gray-500">from {reviewSummary.userRatingCount} ratings</span>}
              </div>
              <p className="mt-2 text-sm italic leading-relaxed text-gray-700">&ldquo;{activeReviewQuote}&rdquo;</p>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-48 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : reviewsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{reviewsError}</div>
          ) : reviews.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {reviews.slice(0, 3).map((review, index) => (
                <div key={review.authorName + index} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 text-golden">{'★'.repeat(Math.max(1, Math.min(5, Math.round(review.rating || 0))))}</div>
                  <p className="text-sm leading-relaxed text-gray-700">&ldquo;{review.text || 'Great instruction and professional service.'}&rdquo;</p>
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <p className="font-bold text-black">{review.authorName}</p>
                    {review.relativeTime && <p className="text-xs text-gray-500">{review.relativeTime}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">Live review content is temporarily unavailable.</div>
          )}
        </div>
      </section>

      {/* Isaac + KPNE */}
      <section className="bg-gray-50 py-14 sm:py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid overflow-hidden rounded-lg bg-white shadow-xl md:grid-cols-2">
            <div className="relative min-h-[28rem] bg-black">
              <Image
                src="/images/golden-hour-skyline-flight.png"
                alt="Golden-hour flight near Northeast Philadelphia Airport"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute bottom-0 p-6 text-white sm:p-8">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-golden">Home airport</p>
                <h2 className="mt-2 text-4xl font-black uppercase leading-none tracking-normal">KPNE Philadelphia</h2>
              </div>
            </div>
            <div className="p-6 sm:p-8 md:p-10">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-golden">Meet your CFI</p>
              <h2 className="text-3xl font-black uppercase tracking-normal text-black sm:text-4xl">Isaac Prestwich</h2>
              <p className="mt-3 text-lg font-semibold text-gray-800">Certified Flight Instructor and owner of Merlin Flight Training.</p>
              <p className="mt-5 leading-relaxed text-gray-600">
                Merlin is built around one-on-one instruction, realistic expectations, and training that fits your aircraft, Merlin&apos;s aircraft, or your schedule. You get a clear plan before you commit to the next step.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {['CFI-led', 'One-on-one', 'KPNE based'].map((item) => (
                  <div key={item} className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center font-bold text-black">{item}</div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/discovery-flight-funnel" className="rounded-lg bg-black px-6 py-4 text-center font-bold text-white transition-colors hover:bg-golden hover:text-black">
                  Get My Free Training Plan
                </Link>
                <a
                  href="https://maps.google.com/?q=Northeast+Philadelphia+Airport+KPNE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-300 px-6 py-4 text-center font-bold text-black transition-colors hover:border-golden hover:text-golden"
                >
                  Open KPNE in Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-black py-20 text-white sm:py-24 md:py-32">
        <Image
          src="/images/our-aircraft-header.JPG"
          alt="Merlin aircraft on the ramp"
          fill
          className="object-cover opacity-35"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/30" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-golden">Ready when you are</p>
          <h2 className="text-4xl font-black uppercase leading-none tracking-normal sm:text-5xl md:text-7xl">Start with a plan, then take the left seat.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-200 sm:text-lg">
            Fill out the form and get free information on becoming a pilot with Merlin Flight Training.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/discovery-flight-funnel" className="rounded-lg bg-golden px-8 py-4 text-center font-black text-black transition-colors hover:bg-yellow-500">
              Get My Free Training Plan
            </Link>
            <Link href="/pricing" className="rounded-lg border border-white/30 bg-white/10 px-8 py-4 text-center font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
              View Training & Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
