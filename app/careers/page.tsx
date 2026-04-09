'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type CareerStage = {
  phase: string
  title: string
  duration: string
  goals: string[]
  milestone: string
}

const careerStages: CareerStage[] = [
  {
    phase: 'Stage 1',
    title: 'Start Your Journey',
    duration: '0 hours · No certificate required',
    goals: [
      'Take your discovery flight',
      'Enroll and meet your instructor',
      'Set your training schedule',
    ],
    milestone: 'You are officially a student pilot.',
  },
  {
    phase: 'Stage 2',
    title: 'Private Pilot Certificate',
    duration: '~60–80 hours total',
    goals: [
      'Build foundational aircraft control',
      'Solo flights and cross-country navigation',
      'Pass the FAA written test and checkride',
    ],
    milestone: 'Private Pilot Certificate earned.',
  },
  {
    phase: 'Stage 3',
    title: 'Instrument Rating',
    duration: '~50 additional hours',
    goals: [
      'Train to fly in clouds and low visibility',
      'Master approach procedures and IFR navigation',
      'Pass the instrument written test and checkride',
    ],
    milestone: 'Instrument Rating added to certificate.',
  },
  {
    phase: 'Stage 4',
    title: 'CFI Certificate',
    duration: '~20–40 additional hours',
    goals: [
      'Learn to teach and evaluate students',
      'Complete the FOI and FIA knowledge tests',
      'Pass the CFI checkride with an FAA examiner',
    ],
    milestone: 'Certified Flight Instructor certificate earned.',
  },
  {
    phase: 'Stage 5',
    title: 'Career at Merlin',
    duration: 'Hired · Building flight hours',
    goals: [
      'Join the Merlin instructor team',
      'Build hours toward commercial minimums',
      'Merlin graduates may be considered for affiliated aviation opportunities as the organization grows.',
    ],
    milestone: 'You fly. We pay. Career in aviation begins.',
  },
]

export default function CareersPage() {
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    itemRefs.current.forEach((node, index) => {
      if (!node) return

      const observer = new IntersectionObserver(
        (entries) => {
          const isVisible = entries.some((entry) => entry.isIntersecting)
          if (isVisible) {
            setActiveIndex(index)
          }
        },
        {
          root: null,
          threshold: 0.45,
        }
      )

      observer.observe(node)
      observers.push(observer)
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden py-12 sm:py-16"
        style={{
          backgroundImage: "url('/images/our-aircraft-header.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 58%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="mb-4 inline-block">
            <div className="w-16 sm:w-20 h-1 bg-golden mx-auto rounded-full" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Fly Here. Get Hired Here.
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            From your first discovery flight to a paid flying career — Merlin is the full path.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-8 lg:gap-12">
          {/* Sticky Sidebar */}
          <aside className="lg:sticky lg:top-28 h-fit rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Current Stage
            </p>
            <p className="text-xl font-bold text-darkText mb-2">
              {careerStages[activeIndex].phase}
            </p>
            <p className="text-sm text-gray-600 mb-5">
              {careerStages[activeIndex].title}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Typical Timeline
            </p>
            <p className="text-sm text-gray-700">{careerStages[activeIndex].duration}</p>
            <div className="mt-5 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-golden transition-all duration-300"
                style={{
                  width: `${((activeIndex + 1) / careerStages.length) * 100}%`,
                }}
              />
            </div>
          </aside>

          {/* Timeline List */}
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-12">
              {careerStages.map((stage, index) => {
                const isActive = index <= activeIndex
                return (
                  <div
                    key={stage.title}
                    ref={(el) => {
                      itemRefs.current[index] = el
                    }}
                    className="relative pl-10"
                  >
                    <div
                      className={`absolute left-0 top-2 h-6 w-6 rounded-full border-4 transition-colors ${
                        isActive ? 'border-golden bg-black' : 'border-gray-300 bg-white'
                      }`}
                    />
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-golden mb-1">
                        {stage.phase}
                      </p>
                      <h2 className="text-2xl font-bold text-darkText mb-1">{stage.title}</h2>
                      <p className="text-xs text-gray-500 mb-4">{stage.duration}</p>
                      <ul className="space-y-2 mb-4">
                        {stage.goals.map((goal) => (
                          <li key={goal} className="flex items-start gap-2 text-gray-700">
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-golden" />
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="rounded-lg border border-golden/30 bg-golden/10 px-4 py-3 text-base font-bold text-darkText">
                        {stage.milestone}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom CTAs */}
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/discovery-flight"
            className="inline-block rounded-lg bg-black px-6 py-3 font-bold text-white hover:bg-gray-900"
          >
            Book Your Discovery Flight
          </Link>
          <Link
            href="/private-pilot-timeline"
            className="inline-block rounded-lg border border-golden px-6 py-3 font-bold text-golden hover:bg-golden/10"
          >
            See Training Timeline
          </Link>
        </div>
      </section>
    </div>
  )
}
