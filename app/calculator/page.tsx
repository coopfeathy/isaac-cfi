"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen = "q1" | "q2" | "loading" | "results-career" | "results-partial"
type Stage  = "ppl" | "ir" | "cpl"
type Career = "ag" | "cargo" | "airline"

// ─── Data ────────────────────────────────────────────────────────────────────
const STAGE_INFO: Record<Stage, { label: string; cost: number; color: string; sub: string; includes: string[] }> = {
  ppl: {
    label: "Private Pilot Certificate",
    cost: 16725,
    color: "#FFBF00",
    sub: "Your foundation — the license to fly",
    includes: ["Ground school", "40 hrs dual instruction", "20 hrs solo flight", "Checkride prep & fees"],
  },
  ir: {
    label: "Instrument Rating",
    cost: 14975,
    color: "#60A5FA",
    sub: "Fly through clouds, in any weather",
    includes: ["Ground school", "50 hrs dual instruction", "Checkride prep & fees"],
  },
  cpl: {
    label: "Commercial Certificate",
    cost: 30500,
    color: "#34D399",
    sub: "Get paid to fly",
    includes: ["Ground school", "35 hrs dual instruction", "105 hrs solo / PIC", "Checkride prep & fees"],
  },
}

const CAREER_INFO: Record<Career, { label: string; low: number; high: number; note: string }> = {
  ag:      { label: "Agricultural Pilot",   low: 48000,  high: 95000,  note: "Crop dusting, survey & aerial application" },
  cargo:   { label: "Cargo Pilot",           low: 80000,  high: 180000, note: "Regional freight to major cargo carriers" },
  airline: { label: "Airline Pilot",          low: 100000, high: 350000, note: "Regional to major airline — F/O to Captain" },
}

const STAGES: Stage[]  = ["ppl", "ir",  "cpl"]
const CAREERS: Career[] = ["ag", "cargo", "airline"]

// ─── Animation variants ───────────────────────────────────────────────────────
const qVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.2, ease: "easeIn" as const } },
}

const cardVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.09, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

const resultCardVariants = {
  hidden:  { opacity: 0, scale: 0.94, y: 16 },
  visible: (i: number) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { delay: 0.1 + i * 0.12, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

// ─── useCountUp ──────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, active = true) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (!active) { setValue(0); return }
    const start = performance.now()
    const from  = value
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * ease))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, active])

  return value
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="min-h-screen bg-[#0D0F10] flex flex-col items-center justify-center gap-8 px-6">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative w-20 h-20 flex items-center justify-center"
      >
        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#FFBF00]"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#FFBF00]"
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        {/* Plane icon */}
        <span className="text-3xl select-none" role="img" aria-label="plane">✈</span>
      </motion.div>

      {/* Progress bar */}
      <div className="w-64 h-[3px] bg-[#1C1E20] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#FFBF00] rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[#888888] text-sm tracking-wide"
      >
        Building your estimate…
      </motion.p>
    </div>
  )
}

// ─── Career Results ───────────────────────────────────────────────────────────
function CareerResults({ onReset }: { onReset: () => void }) {
  const [career, setCareer] = useState<Career | null>(null)
  const total = STAGES.reduce((s, k) => s + STAGE_INFO[k].cost, 0)
  const totalCount = useCountUp(total, 1400, true)

  const info = career ? CAREER_INFO[career] : null
  const salaryLow  = useCountUp(info?.low  ?? 0, 1000, career !== null)
  const salaryHigh = useCountUp(info?.high ?? 0, 1200, career !== null)

  return (
    <div className="min-h-screen bg-[#0D0F10] text-white">
      {/* Nav */}
      <div className="px-6 pt-4 pb-2">
        <button onClick={onReset} className="flex items-center gap-1.5 text-[#555555] text-sm hover:text-white transition-colors">
          <span className="text-base">‹</span> Start over
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <p className="text-[#FFBF00] text-xs font-mono uppercase tracking-widest">Your career path estimate</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            ${totalCount.toLocaleString()}
          </h1>
          <p className="text-[#888888] text-base">Total investment · Private → Instrument → Commercial</p>
        </motion.div>

        {/* Stage cost cards */}
        <div className="space-y-3">
          {STAGES.map((key, i) => {
            const s = STAGE_INFO[key]
            return (
              <motion.div
                key={key}
                custom={i}
                variants={resultCardVariants}
                initial="hidden"
                animate="visible"
                className="bg-[#1C1E20] rounded-2xl px-6 py-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <div>
                    <p className="text-white font-semibold text-base">{s.label}</p>
                    <p className="text-[#666666] text-sm">{s.sub}</p>
                  </div>
                </div>
                <p className="text-white font-bold text-xl flex-shrink-0" style={{ color: s.color }}>
                  ${s.cost.toLocaleString()}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="border-t border-white/10 pt-10 space-y-4"
        >
          <p className="text-[#FFBF00] text-xs font-mono uppercase tracking-widest">Now you're working</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">What does your salary look like?</h2>
          <p className="text-[#888888] text-sm">Select a career path to see expected earnings.</p>
        </motion.div>

        {/* Career selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="space-y-3"
        >
          {CAREERS.map((key, i) => {
            const c = CAREER_INFO[key]
            const active = career === key
            return (
              <motion.button
                key={key}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                onClick={() => setCareer(key)}
                className={`w-full text-left bg-[#1C1E20] rounded-2xl px-6 py-5 flex items-center gap-4 transition-all duration-200 border-2 ${active ? "border-[#FFBF00]" : "border-transparent hover:border-white/10"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${active ? "border-[#FFBF00] bg-[#FFBF00]" : "border-[#444444]"}`}>
                  {active && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-base">{c.label}</p>
                  <p className="text-[#666666] text-sm">{c.note}</p>
                </div>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Salary display */}
        <AnimatePresence>
          {career && (
            <motion.div
              key={career}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="bg-[#1C1E20] rounded-2xl p-8 text-center space-y-2"
            >
              <p className="text-[#888888] text-sm uppercase tracking-widest font-mono">Expected Annual Salary</p>
              <p className="text-4xl sm:text-5xl font-bold text-white">
                ${salaryLow.toLocaleString()} – ${salaryHigh.toLocaleString()}
              </p>
              <p className="text-[#666666] text-sm">{CAREER_INFO[career].note}</p>
              <div className="pt-4">
                <div className="text-xs text-[#555555]">
                  Estimated payback period: <span className="text-[#FFBF00]">
                    {Math.round((total / ((CAREER_INFO[career].low + CAREER_INFO[career].high) / 2)) * 12)} months
                  </span> at median salary
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF download */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          className="flex justify-center"
        >
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-[#555555] text-sm hover:text-[#FFBF00] transition-colors border border-white/10 rounded-xl px-4 py-2.5 hover:border-[#FFBF00]/30"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
              <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download estimate as PDF
          </button>
        </motion.div>

        {/* Offer cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="space-y-3 pb-16"
        >
          <p className="text-[#FFBF00] text-xs font-mono uppercase tracking-widest text-center pb-2">Ready to get started?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="/discovery-flight"
              className="bg-[#FFBF00] text-black rounded-2xl px-6 py-6 flex flex-col gap-2 hover:bg-[#E6AC00] transition-colors group"
            >
              <span className="text-2xl">✈</span>
              <p className="font-bold text-lg leading-tight">Book an Intro Flight</p>
              <p className="text-black/60 text-sm leading-snug">Get in the cockpit and try flying for yourself — no experience needed.</p>
              <span className="text-sm font-semibold mt-1 group-hover:translate-x-1 transition-transform inline-block">Book now →</span>
            </a>
            <a
              href="/contact"
              className="bg-[#1C1E20] border-2 border-white/10 text-white rounded-2xl px-6 py-6 flex flex-col gap-2 hover:border-white/25 transition-colors group"
            >
              <span className="text-2xl">📞</span>
              <p className="font-bold text-lg leading-tight">Schedule a Call</p>
              <p className="text-[#666666] text-sm leading-snug">Talk through your goals with Isaac before committing to anything.</p>
              <span className="text-[#FFBF00] text-sm font-semibold mt-1 group-hover:translate-x-1 transition-transform inline-block">Get in touch →</span>
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  )
}

// ─── Partial Results ──────────────────────────────────────────────────────────
function PartialResults({ stages, onReset }: { stages: Set<Stage>; onReset: () => void }) {
  const selected = STAGES.filter(s => stages.has(s))
  const total    = selected.reduce((s, k) => s + STAGE_INFO[k].cost, 0)
  const totalCount = useCountUp(total, 1400, true)

  return (
    <div className="min-h-screen bg-[#0D0F10] text-white">
      {/* Nav */}
      <div className="px-6 pt-4 pb-2">
        <button onClick={onReset} className="flex items-center gap-1.5 text-[#555555] text-sm hover:text-white transition-colors">
          <span className="text-base">‹</span> Start over
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <p className="text-[#FFBF00] text-xs font-mono uppercase tracking-widest">Your personalized estimate</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            ${totalCount.toLocaleString()}
          </h1>
          <p className="text-[#888888] text-base">
            {selected.map(s => STAGE_INFO[s].label).join(" · ")}
          </p>
        </motion.div>

        {/* Stage cards with details */}
        <div className="space-y-4">
          {selected.map((key, i) => {
            const s = STAGE_INFO[key]
            return (
              <motion.div
                key={key}
                custom={i}
                variants={resultCardVariants}
                initial="hidden"
                animate="visible"
                className="bg-[#1C1E20] rounded-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <div>
                      <p className="text-white font-semibold text-base">{s.label}</p>
                      <p className="text-[#666666] text-sm">{s.sub}</p>
                    </div>
                  </div>
                  <p className="font-bold text-xl flex-shrink-0" style={{ color: s.color }}>
                    ${s.cost.toLocaleString()}
                  </p>
                </div>

                {/* Includes */}
                <div className="px-6 pb-5 border-t border-white/6 pt-4">
                  <ul className="space-y-1.5">
                    {s.includes.map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm text-[#888888]">
                        <span className="text-[#FFBF00] text-xs">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Offer cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="space-y-3 pb-16"
        >
          <p className="text-[#FFBF00] text-xs font-mono uppercase tracking-widest text-center pb-2">Ready to get started?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="/discovery-flight"
              className="bg-[#FFBF00] text-black rounded-2xl px-6 py-6 flex flex-col gap-2 hover:bg-[#E6AC00] transition-colors group"
            >
              <span className="text-2xl">✈</span>
              <p className="font-bold text-lg leading-tight">Book an Intro Flight</p>
              <p className="text-black/60 text-sm leading-snug">Get in the cockpit and try flying for yourself — no experience needed.</p>
              <span className="text-sm font-semibold mt-1 group-hover:translate-x-1 transition-transform inline-block">Book now →</span>
            </a>
            <a
              href="/contact"
              className="bg-[#1C1E20] border-2 border-white/10 text-white rounded-2xl px-6 py-6 flex flex-col gap-2 hover:border-white/25 transition-colors group"
            >
              <span className="text-2xl">📞</span>
              <p className="font-bold text-lg leading-tight">Schedule a Call</p>
              <p className="text-[#666666] text-sm leading-snug">Talk through your goals with Isaac before committing to anything.</p>
              <span className="text-[#FFBF00] text-sm font-semibold mt-1 group-hover:translate-x-1 transition-transform inline-block">Get in touch →</span>
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalculatorPage() {
  const [screen,      setScreen]      = useState<Screen>("q1")
  const [path,        setPath]        = useState<"portion" | "career" | null>(null)
  const [selectedQ1,  setSelectedQ1]  = useState<string | null>(null)
  const [stages,      setStages]      = useState<Set<Stage>>(new Set())
  const [loadingDest, setLoadingDest] = useState<Screen>("results-career")

  function goLoading(dest: Screen) {
    setLoadingDest(dest)
    setScreen("loading")
  }

  function handleQ1(choice: "portion" | "career") {
    setPath(choice)
    setSelectedQ1(choice)
    setTimeout(() => {
      setSelectedQ1(null)
      if (choice === "career") {
        setScreen("results-career")
      } else {
        setScreen("q2")
      }
    }, 260)
  }

  function toggleStage(s: Stage) {
    setStages(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  function handleContinue() {
    if (stages.size === 0) return
    goLoading("results-partial")
  }

  function handleReset() {
    setScreen("q1")
    setPath(null)
    setSelectedQ1(null)
    setStages(new Set())
  }

  const Q1_OPTIONS = [
    {
      value: "portion",
      label: "Personal Pilot",
      description: "I want specific certifications or ratings",
      icon: "/icons/merlin/icons/merlin-aircraft-single-engine.svg",
    },
    {
      value: "career",
      label: "Career Pilot",
      description: "I'm aiming for a full professional flying career",
      icon: "/icons/merlin/icons/merlin-aircraft-airliner.svg",
    },
  ]

  const STAGE_OPTIONS: { key: Stage; label: string; sub: string }[] = [
    { key: "ppl", label: "Private Pilot Certificate", sub: "The foundation — fly as pilot-in-command" },
    { key: "ir",  label: "Instrument Rating",          sub: "Fly in clouds and low-visibility conditions" },
    { key: "cpl", label: "Commercial Certificate",     sub: "Get paid to fly" },
  ]

  return (
    <div className="overflow-hidden bg-[#0D0F10] min-h-screen">
      <AnimatePresence mode="wait">

        {/* Q1 + Q2 — single persistent shell, only inner content animates */}
        {(screen === "q1" || screen === "q2") && (
          <motion.div
            key="quiz-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="h-screen bg-[#0D0F10] flex flex-col overflow-hidden"
          >
            {/* Header row — static, doesn't animate between questions */}
            <div className="flex items-center justify-between px-6 py-4">
              <button
                onClick={() => screen === "q2" && setScreen("q1")}
                className={`flex items-center gap-1.5 text-[#555555] text-sm transition-all hover:text-white ${screen === "q1" ? "opacity-0 pointer-events-none" : "opacity-100"}`}
              >
                <span className="text-base leading-none">‹</span> Back
              </button>
              <span className="text-[#666666] text-sm font-medium">Training Cost Calculator</span>
              <span className="text-[#555555] text-sm">{screen === "q1" ? "1" : "2"} of 2</span>
            </div>

            {/* Progress bar — animates width smoothly */}
            <div className="px-6 pb-4">
              <div className="w-full h-[4px] bg-[#1C1E20] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#FFBF00] rounded-full"
                  initial={false}
                  animate={{ width: screen === "q1" ? "50%" : "100%" }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
            </div>

            {/* Inner content — static centering (matches the quiz); only the keyed block animates */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-x-hidden">
              <div className="max-w-xl w-full">
                <AnimatePresence mode="wait">

                {/* Q1 content */}
                {screen === "q1" && (
                  <motion.div
                    key="q1-content"
                    variants={qVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-10"
                  >
                      <div className="text-center space-y-3">
                        <h2 className="text-white text-3xl sm:text-4xl font-semibold tracking-tight leading-snug">
                          What flight training program are you wanting?
                        </h2>
                        <p className="text-[#888888] text-sm sm:text-base">
                          Select the path that best describes your goals.
                        </p>
                      </div>

                      {/* Desktop 2-col cards */}
                      <div className="hidden sm:grid grid-cols-2 gap-3">
                        {Q1_OPTIONS.map((opt, i) => (
                          <motion.button
                            key={opt.value}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            onClick={() => handleQ1(opt.value as "portion" | "career")}
                            style={{ aspectRatio: "16/9" }}
                            className="text-center bg-[#1C1E20] rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer w-full hover:bg-[#222426] transition-colors"
                          >
                            <img src={opt.icon} alt="" width={36} height={36} className="opacity-80" />
                            <div className="space-y-1.5 px-4">
                              <p className="text-white font-semibold text-xl">{opt.label}</p>
                              <p className="text-[#666666] text-base leading-snug">{opt.description}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>

                      {/* Mobile stacked */}
                      <div className="flex sm:hidden flex-col gap-2">
                        {Q1_OPTIONS.map((opt, i) => (
                          <motion.button
                            key={opt.value}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            onClick={() => handleQ1(opt.value as "portion" | "career")}
                            className="flex items-center gap-4 bg-[#1C1E20] rounded-2xl px-5 py-5 cursor-pointer w-full text-left hover:bg-[#222426] transition-colors"
                          >
                            <img src={opt.icon} alt="" width={28} height={28} className="opacity-80 flex-shrink-0" />
                            <div className="flex-1 space-y-0.5">
                              <p className="text-white font-semibold text-base">{opt.label}</p>
                              <p className="text-[#666666] text-sm leading-snug">{opt.description}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                  </motion.div>
                )}

                {/* Q2 content */}
                {screen === "q2" && (
                  <motion.div
                    key="q2-content"
                    variants={qVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-8 pb-24 sm:pb-0"
                  >
                      <div className="text-center space-y-3">
                        <h2 className="text-white text-3xl sm:text-4xl font-semibold tracking-tight leading-snug">
                          What are you looking for in your training?
                        </h2>
                        <p className="text-[#888888] text-sm sm:text-base">
                          Select all that apply — you can always add more later.
                        </p>
                      </div>

                      {/* Stage checkboxes */}
                      <div className="flex flex-col gap-3">
                        {STAGE_OPTIONS.map((opt, i) => {
                          const checked = stages.has(opt.key)
                          return (
                            <motion.button
                              key={opt.key}
                              custom={i}
                              variants={cardVariants}
                              initial="hidden"
                              animate="visible"
                              onClick={() => toggleStage(opt.key)}
                              className={`w-full text-left bg-[#1C1E20] rounded-2xl px-5 py-5 flex items-center gap-4 transition-all duration-200 border-2 ${checked ? "border-[#FFBF00]" : "border-transparent"}`}
                            >
                              <div
                                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors duration-100 border-2"
                                style={{ borderColor: checked ? "#FFBF00" : "#444444", background: checked ? "#FFBF00" : "transparent" }}
                              >
                                {checked && (
                                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 space-y-0.5">
                                <p className="text-white font-semibold text-base">{opt.label}</p>
                                <p className="text-[#666666] text-sm leading-snug">{opt.sub}</p>
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>

                      {/* Continue — desktop */}
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="hidden sm:block">
                        <button
                          onClick={handleContinue}
                          disabled={stages.size === 0}
                          className="w-full bg-[#FFBF00] text-black font-bold py-4 rounded-2xl text-base disabled:opacity-30 transition-opacity hover:bg-[#E6AC00]"
                        >
                          {stages.size === 0 ? "Select at least one →" : "See my estimate →"}
                        </button>
                      </motion.div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
            </div>

            {/* Continue — mobile sticky (Q2 only) */}
            {screen === "q2" && (
              <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#0D0F10] border-t border-white/10">
                <button
                  onClick={handleContinue}
                  disabled={stages.size === 0}
                  className="w-full bg-[#FFBF00] text-black font-bold py-4 rounded-2xl text-base disabled:opacity-30 transition-opacity"
                >
                  {stages.size === 0 ? "Select at least one →" : "See my estimate →"}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Loading */}
        {screen === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingScreen onDone={() => setScreen(loadingDest)} />
          </motion.div>
        )}

        {/* Career Results */}
        {screen === "results-career" && (
          <motion.div key="results-career" variants={qVariants} initial="hidden" animate="visible" exit="exit">
            <CareerResults onReset={handleReset} />
          </motion.div>
        )}

        {/* Partial Results */}
        {screen === "results-partial" && (
          <motion.div key="results-partial" variants={qVariants} initial="hidden" animate="visible" exit="exit">
            <PartialResults stages={stages} onReset={handleReset} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
