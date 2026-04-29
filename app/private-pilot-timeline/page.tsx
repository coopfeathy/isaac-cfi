"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

type TimelineItem = {
  phase: string
  title: string
  duration: string
  goals: string[]
  milestone: string
}

const timeline: TimelineItem[] = [
  {
    phase: "Phase 1",
    title: "Discovery + Enrollment",
    duration: "Week 1",
    goals: [
      "Take your discovery flight",
      "Set training goals and realistic cadence",
      "Complete onboarding and account setup",
    ],
    milestone: "You are officially in training.",
  },
  {
    phase: "Phase 2",
    title: "Foundations + Pre-Solo",
    duration: "Weeks 2-8",
    goals: [
      "Aircraft control basics and checklist discipline",
      "Pattern work, takeoffs, landings, and emergency procedures",
      "Solo readiness review with your instructor",
    ],
    milestone: "First solo flight.",
  },
  {
    phase: "Phase 3",
    title: "Cross-Country + Solo Building",
    duration: "Weeks 8-16",
    goals: [
      "Dual and solo cross-country planning and execution",
      "Navigation, weather, and airspace decision-making",
      "Night requirements and solo consolidation",
    ],
    milestone: "Long cross-country requirement complete.",
  },
  {
    phase: "Phase 4",
    title: "Knowledge Test + Checkride Prep",
    duration: "Weeks 16-24",
    goals: [
      "Ground knowledge review and FAA written test completion",
      "Polish ACS maneuvers to checkride standards",
      "Mock oral and mock practical evaluation",
    ],
    milestone: "Signed off for practical test.",
  },
  {
    phase: "Phase 5",
    title: "Practical Test + Certificate",
    duration: "Final Stage",
    goals: [
      "Complete oral exam with DPE",
      "Demonstrate flight proficiency to ACS standards",
      "Plan your first post-certificate proficiency goals",
    ],
    milestone: "Private pilot certificate earned.",
  },
]

export default function PrivatePilotTimelinePage() {
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
      <section
        className="relative overflow-hidden py-12 sm:py-16"
        style={{
          backgroundImage: "url('/images/our-aircraft-header.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 58%",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="mb-4 inline-block">
            <div className="w-16 sm:w-20 h-1 bg-golden mx-auto rounded-full" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Private Pilot <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Training Timeline</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Scroll through each phase to see where you are now and what comes next.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-8 lg:gap-12">
          <aside className="lg:sticky lg:top-28 h-fit rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Current phase</p>
            <p className="text-xl font-bold text-darkText mb-2">{timeline[activeIndex].phase}</p>
            <p className="text-sm text-gray-600 mb-5">{timeline[activeIndex].title}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Typical pace</p>
            <p className="text-sm text-gray-700">{timeline[activeIndex].duration}</p>
            <div className="mt-5 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-golden transition-all duration-300"
                style={{ width: `${((activeIndex + 1) / timeline.length) * 100}%` }}
              />
            </div>
          </aside>

          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-12">
              {timeline.map((item, index) => {
                const isActive = index <= activeIndex
                return (
                  <div
                    key={item.title}
                    ref={(el) => {
                      itemRefs.current[index] = el
                    }}
                    className="relative pl-10"
                  >
                    <div
                      className={`absolute left-0 top-2 h-6 w-6 rounded-full border-4 transition-colors ${
                        isActive ? "border-golden bg-black" : "border-gray-300 bg-white"
                      }`}
                    />
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-golden mb-1">{item.phase}</p>
                      <h2 className="text-2xl font-bold text-darkText mb-1">{item.title}</h2>
                      <p className="text-sm text-gray-500 mb-4">Typical duration: {item.duration}</p>
                      <ul className="space-y-2 mb-4">
                        {item.goals.map((goal) => (
                          <li key={goal} className="flex items-start gap-2 text-gray-700">
                            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-golden" />
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="rounded-lg border border-golden/30 bg-golden/10 px-4 py-3 text-sm font-medium text-darkText">
                        Milestone: {item.milestone}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/learn"
            className="inline-block rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
          >
            Back to Learn
          </Link>
          <Link
            href="https://app.merlinflighttraining.com/schedule"
            className="inline-block rounded-lg border border-golden px-6 py-3 font-semibold text-golden hover:bg-golden hover:text-black"
          >
            Book a Flight Lesson
          </Link>
        </div>
      </section>
    </div>
  )
}
