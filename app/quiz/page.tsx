"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

type CardQuestion = {
  type: "cards"
  id: string
  question: string
  subtitle: string
  options: { label: string; description: string; value: string; icon: string; disqualifies?: boolean }[]
}

type EmailQuestion = {
  type: "email"
  id: string
  question: string
  subtitle: string
}

type Question = CardQuestion | EmailQuestion

const QUESTIONS: Question[] = [
  {
    type: "cards",
    id: "age",
    question: "How old are you?",
    subtitle: "Age affects when you can solo and when you can earn your certificate.",
    options: [
      { label: "16 or younger", description: "You can start training now", value: "under_17", icon: "/icons/merlin/icons/merlin-ui-profile.svg" },
      { label: "17 – 25", description: "Prime years to earn your wings", value: "17_25", icon: "/icons/merlin/icons/merlin-ui-profile.svg" },
      { label: "25 – 40", description: "A great time to start flying", value: "25_40", icon: "/icons/merlin/icons/merlin-ui-profile.svg" },
      { label: "40+", description: "People learn to fly at every age", value: "40_plus", icon: "/icons/merlin/icons/merlin-ui-profile.svg" },
    ],
  },
  {
    type: "cards",
    id: "citizen",
    question: "Are you a U.S. citizen or permanent resident?",
    subtitle: "The TSA requires citizenship or immigration verification for all student pilots.",
    options: [
      { label: "U.S. citizen", description: "Born or naturalized — no extra steps", value: "citizen", icon: "/icons/merlin/icons/merlin-sym-check-circle.svg" },
      { label: "Permanent resident", description: "Green card holders are eligible", value: "green_card", icon: "/icons/merlin/icons/merlin-doc-license.svg" },
      { label: "On a visa", description: "Additional TSA steps required", value: "visa", icon: "/icons/merlin/icons/merlin-ui-world.svg" },
      { label: "Not sure", description: "We can help you figure it out", value: "unsure_citizen", icon: "/icons/merlin/icons/merlin-train-question.svg" },
    ],
  },
  {
    type: "cards",
    id: "medical",
    question: "Any significant medical conditions?",
    subtitle: "A 3rd-class FAA medical is required before your first solo. Most people pass easily.",
    options: [
      { label: "Healthy, no issues", description: "You'll pass the medical with no problem", value: "healthy", icon: "/icons/merlin/icons/merlin-sym-check-circle.svg" },
      { label: "Minor issues", description: "Glasses, controlled BP — usually fine", value: "minor", icon: "/icons/merlin/icons/merlin-doc-medical.svg" },
      { label: "Serious condition", description: "May require an SI — let's talk", value: "serious", icon: "/icons/merlin/icons/merlin-safe-warning.svg" },
      { label: "Denied before", description: "BasicMed or Sport Pilot may still work", value: "denied", icon: "/icons/merlin/icons/merlin-doc-checklist.svg" },
    ],
  },
  {
    type: "cards",
    id: "finance",
    question: "How are you thinking about paying for training?",
    subtitle: "Most students earn their Private Pilot Certificate for $12,000–$18,000. There's no single right way to fund it.",
    options: [
      { label: "Ready to invest", description: "Let's get started right away", value: "ready", icon: "/icons/merlin/icons/merlin-ui-takeoff.svg" },
      { label: "Want to finance", description: "Pay monthly or as you go", value: "finance", icon: "/icons/merlin/icons/merlin-doc-calculator.svg" },
      { label: "Still budgeting", description: "Exploring options right now", value: "exploring", icon: "/icons/merlin/icons/merlin-doc-perf-chart.svg" },
      { label: "Depends on timing", description: "I'll know more soon", value: "timing", icon: "/icons/merlin/icons/merlin-doc-calendar.svg" },
    ],
  },
  {
    type: "cards",
    id: "schedule",
    question: "When do you want to start flying?",
    subtitle: "There's no wrong answer — this helps Isaac plan availability for you.",
    options: [
      { label: "As soon as possible", description: "I'm ready to book a lesson now", value: "asap", icon: "/icons/merlin/icons/merlin-ui-takeoff.svg" },
      { label: "Within the next month", description: "Getting my ducks in a row first", value: "month", icon: "/icons/merlin/icons/merlin-doc-calendar.svg" },
      { label: "Within 3–6 months", description: "Planning ahead for later this year", value: "quarter", icon: "/icons/merlin/icons/merlin-doc-stopwatch.svg" },
      { label: "Just exploring for now", description: "Not committing to a date yet", value: "exploring", icon: "/icons/merlin/icons/merlin-train-bulb.svg" },
    ],
  },
  {
    type: "cards",
    id: "timeline",
    question: "How fast do you want to earn your certificate?",
    subtitle: "Training pace is flexible — some students fly weekly, others every other week.",
    options: [
      { label: "As fast as possible", description: "Flying multiple times per week", value: "fast", icon: "/icons/merlin/icons/merlin-inst-tachometer.svg" },
      { label: "Steady pace", description: "Once or twice a week works for me", value: "steady", icon: "/icons/merlin/icons/merlin-ui-route.svg" },
      { label: "Slow and steady", description: "Once every week or two is fine", value: "slow", icon: "/icons/merlin/icons/merlin-doc-logbook.svg" },
      { label: "No preference", description: "I'll see how it goes", value: "flexible", icon: "/icons/merlin/icons/merlin-train-question.svg" },
    ],
  },
  {
    type: "email",
    id: "email",
    question: "You're almost there — see your results.",
    subtitle: "Enter your full name and email below to unlock your personalized pilot roadmap.",
  },
]

const cardVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

const questionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.2, ease: "easeIn" },
  },
}

// Constellation layout: center first, then star-order outward (0°→120°→240°→60°→180°→300°)
// cx/cy are % of container from top-left, representing the CENTER of each photo
const CONSTELLATION = [
  { src: "/quiz-photos/photo1.jpeg",   cx: 50, cy: 48, size: 30, delay: 0,    rotate: "-1deg"  }, // center — first
  { src: "/quiz-photos/IMG_7941.jpeg", cx: 50, cy: 10, size: 22, delay: 0.38, rotate: "2deg"   }, // top      0°
  { src: "/quiz-photos/photo3.jpeg",   cx: 80, cy: 70, size: 22, delay: 0.62, rotate: "-2deg"  }, // bot-right 120°
  { src: "/quiz-photos/IMG_7714.jpeg", cx: 20, cy: 70, size: 22, delay: 0.86, rotate: "1.5deg" }, // bot-left  240°
  { src: "/quiz-photos/photo4.jpeg",   cx: 80, cy: 26, size: 22, delay: 1.1,  rotate: "-1.5deg"}, // top-right 60°
  { src: "/quiz-photos/photo2.jpeg",   cx: 20, cy: 26, size: 22, delay: 1.34, rotate: "2.5deg" }, // top-left  300°
  { src: "/quiz-photos/IMG_7387.jpeg", cx: 50, cy: 88, size: 22, delay: 1.58, rotate: "-2deg"  }, // bottom    180°
]

function PhotoConstellation() {
  return (
    <div style={{ width: "min(100%, 360px)", height: 380, marginBottom: 48, marginLeft: "auto", marginRight: "auto", position: "relative" }}>
      {CONSTELLATION.map((p, i) => (
        <motion.div
          key={p.src}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: p.delay,
            duration: 0.55,
            ease: [0.34, 1.56, 0.64, 1], // spring overshoot
          }}
          style={{
            position: "absolute",
            left: `${p.cx}%`,
            top: `${p.cy}%`,
            width: `${p.size}%`,
            x: "-50%",
            y: "-50%",
            rotate: p.rotate,
            zIndex: i === 0 ? 10 : i,
          }}
          className="rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Yellow orb that dissolves into the photo */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: p.delay + 0.15, duration: 0.5, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              borderRadius: "inherit",
              background: "radial-gradient(circle, #FFDE59 0%, #FFBF00 55%, transparent 100%)",
              boxShadow: "0 0 32px 12px #FFBF00, 0 0 64px 24px #FFBF0066",
            }}
          />
          <img
            src={p.src}
            alt=""
            className="w-full h-full object-cover"
            style={{ aspectRatio: "3/4", display: "block" }}
          />
        </motion.div>
      ))}
    </div>
  )
}

export default function QuizPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const total = QUESTIONS.length
  const progress = ((step + 1) / total) * 100
  const q = QUESTIONS[step]

  function handleCardAnswer(questionId: string, value: string, disqualifies?: boolean) {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)
    setSelected(value)

    setTimeout(() => {
      setSelected(null)
      if (disqualifies) {
        router.push("/quiz/result?outcome=no")
        return
      }
      if (step < total - 1) {
        setStep(step + 1)
      } else {
        router.push(`/quiz/result?outcome=${evaluateOutcome(newAnswers)}`)
      }
    }, 260)
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const outcome = evaluateOutcome(answers) as 'yes' | 'maybe' | 'no'
    try {
      await fetch('/api/quiz-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, outcome, answers }),
      })
    } catch {
      // Non-blocking — still navigate even if the API call fails
    }
    const params = new URLSearchParams({ outcome, name: fullName, email })
    router.push(`/quiz/result?${params.toString()}`)
  }

  function handleBack() {
    if (step > 0) setStep(step - 1)
  }

  function evaluateOutcome(ans: Record<string, string>): string {
    if (ans.medical === "denied" || ans.citizen === "visa") return "maybe"
    return "yes"
  }

  const STEP_LABELS = [
    "About You", "About You", "About You",
    "Your Goals", "Your Goals", "Your Goals",
    "Almost Done",
  ]

  return (
    <div className={`min-h-screen bg-[#0D0F10] flex flex-col ${q.type === "email" ? "lg:flex-row" : ""} [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}>

      {/* ── Left panel: quiz (full width on mobile, half on desktop for last step) ── */}
      <div className={`flex-1 flex flex-col ${q.type === "email" ? "lg:max-w-[55%]" : ""}`}>
        {/* Header row */}
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={handleBack}
            className={`flex items-center gap-1.5 text-[#555555] text-sm transition-all hover:text-white ${step === 0 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            <span className="text-base leading-none">‹</span> Back
          </button>
          <span className="text-[#666666] text-sm font-medium">{STEP_LABELS[step]}</span>
          <span className="text-[#555555] text-sm">{step + 1} of {total}</span>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="w-full h-[4px] bg-[#1C1E20] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#FFBF00] rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </div>

        {/* Content — vertically centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="max-w-xl w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={questionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-10"
              >
                {/* Question heading */}
                <div className="text-center space-y-3">
                  <h2 className="text-white text-3xl sm:text-4xl font-semibold tracking-tight leading-snug">
                    {q.question}
                  </h2>
                  <p className="text-[#888888] text-sm sm:text-base">{q.subtitle}</p>
                </div>

                {/* Card question */}
                {q.type === "cards" && (
                  <>
                    {/* Desktop: 2-col 16:9 grid */}
                    <div className="hidden sm:grid grid-cols-2 gap-3">
                      {q.options.map((opt, i) => (
                        <motion.button
                          key={opt.value}
                          custom={i}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          onClick={() => handleCardAnswer(q.id, opt.value, opt.disqualifies)}
                          style={{ aspectRatio: "16/9" }}
                          className="relative text-center bg-[#1C1E20] rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer w-full"
                        >
                          <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-100 ${selected === opt.value ? "border-[#FFBF00] bg-[#FFBF00]" : "border-[#444444]"}`}>
                            {selected === opt.value && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <Image src={opt.icon} alt="" width={32} height={32} className="opacity-75" />
                          <div className="space-y-1.5">
                            <p className="text-white font-semibold text-xl">{opt.label}</p>
                            <p className="text-[#666666] text-base leading-snug">{opt.description}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    {/* Mobile: stacked rows */}
                    <div className="flex sm:hidden flex-col gap-2">
                      {q.options.map((opt, i) => (
                        <motion.button
                          key={opt.value}
                          custom={i}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          onClick={() => handleCardAnswer(q.id, opt.value, opt.disqualifies)}
                          className="flex items-center gap-4 bg-[#1C1E20] rounded-2xl px-5 py-4 cursor-pointer w-full text-left"
                        >
                          <Image src={opt.icon} alt="" width={24} height={24} className="opacity-75 flex-shrink-0" />
                          <div className="flex-1 space-y-0.5">
                            <p className="text-white font-semibold text-base">{opt.label}</p>
                            <p className="text-[#666666] text-sm leading-snug">{opt.description}</p>
                          </div>
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-100 ${selected === opt.value ? "border-[#FFBF00] bg-[#FFBF00]" : "border-[#444444]"}`}>
                            {selected === opt.value && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}

                {/* Email/name step */}
                {q.type === "email" && (
                  <div className="space-y-6 pb-28 lg:pb-8">
                    {/* Photo constellation — only on mobile (desktop shows video panel) */}
                    <div className="lg:hidden">
                      <PhotoConstellation />
                    </div>

                    {/* Form */}
                    <motion.form
                      onSubmit={handleEmailSubmit}
                      custom={0}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-3"
                    >
                      <input
                        type="text"
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-[#1C1E20] border border-[#2A2A2A] text-white placeholder-[#555555] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#FFBF00] transition-colors"
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-[#1C1E20] border border-[#2A2A2A] text-white placeholder-[#555555] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#FFBF00] transition-colors"
                      />

                      {/* Inline submit on desktop */}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="hidden lg:block w-full bg-[#FFBF00] text-black font-bold py-4 rounded-2xl text-base disabled:opacity-60 transition-opacity mt-2"
                      >
                        {submitting ? "One moment…" : "See My Results →"}
                      </button>
                    </motion.form>

                    {/* Sticky bottom button — mobile only */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#0D0F10]">
                      <form onSubmit={handleEmailSubmit}>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-[#FFBF00] text-black font-bold py-4 rounded-2xl text-base disabled:opacity-60 transition-opacity"
                        >
                          {submitting ? "One moment…" : "See My Results →"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Right panel: video card (desktop only, last step only) ── */}
      {q.type === "email" && (
        <div className="hidden lg:flex lg:w-[45%] items-center justify-center p-4">
          <div className="relative w-full h-full rounded-2xl overflow-hidden">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src="/enginelogin.mp4"
            />
            {/* Bottom caption — frosted card like Higgsfield */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(20,20,20,0.75)", backdropFilter: "blur(12px)" }}>
                <p className="text-white/90 text-sm leading-snug">
                  Real flight training at KPNE — dual instruction in a Grumman AA-5A with CFII Isaac Prestwich.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-xs bg-white/10 rounded-full px-3 py-1">Merlin Flight Training</span>
                  <span className="text-white/50 text-xs bg-white/10 rounded-full px-3 py-1">KPNE</span>
                  <span className="text-white/50 text-xs bg-white/10 rounded-full px-3 py-1">Grumman AA-5A</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
