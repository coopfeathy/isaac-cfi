"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

function ResultContent() {
  const params = useSearchParams()
  const outcome = params.get("outcome") ?? "yes"
  const prefillName = params.get("name") ?? ""
  const prefillEmail = params.get("email") ?? ""

  const [email, setEmail] = useState(prefillEmail)
  const [firstName, setFirstName] = useState(prefillName)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/quiz-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: firstName,
          email,
          outcome: outcome as 'yes' | 'maybe' | 'no',
          answers: {},
        }),
      })
    } catch {
      // Non-blocking
    }
    setSubmitted(true)
    setLoading(false)
  }

  if (outcome === "no") {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-5xl">🛑</div>
          <p className="text-[#FFBF00] text-sm font-semibold tracking-widest uppercase">Your Result</p>
          <h1 className="text-white text-3xl sm:text-4xl font-bold">
            Not Quite Yet — But Don't Give Up
          </h1>
          <p className="text-gray-400 text-base">
            Based on your answers, there may be a hurdle in the way right now — but that doesn't mean flying is off the table forever. Many pilots face early challenges and find a path forward.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-3">
            <p className="text-white font-semibold text-sm">Want to talk through your options?</p>
            <p className="text-gray-400 text-sm">Isaac can help clarify what your specific situation means for your eligibility.</p>
          </div>
          <Link
            href="https://merlinflighttraining.com/book-discovery"
            className="block w-full bg-white/10 border border-white/20 text-white font-semibold py-4 rounded-2xl hover:bg-white/15 transition-all text-center"
          >
            Talk to Isaac →
          </Link>
          <Link href="/quiz" className="block text-gray-500 text-sm hover:text-gray-300 transition-colors">
            ← Retake the quiz
          </Link>
        </div>
      </div>
    )
  }

  if (outcome === "maybe") {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-5xl">🤔</div>
          <p className="text-[#FFBF00] text-sm font-semibold tracking-widest uppercase">Your Result</p>
          <h1 className="text-white text-3xl sm:text-4xl font-bold">
            Probably Yes — With One Step to Clarify
          </h1>
          <p className="text-gray-400 text-base">
            You're a strong candidate, but one of your answers flagged something worth a quick conversation. Isaac can help you understand if there's a simple path forward.
          </p>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <p className="text-white font-semibold text-sm text-center">Get your personalized pilot roadmap</p>
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-white/5 border border-white/15 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFBF00]"
                required
              />
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/15 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFBF00]"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FFBF00] text-black font-bold py-4 rounded-2xl hover:bg-yellow-400 transition-all disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send Me My Roadmap →"}
              </button>
              <p className="text-gray-600 text-xs text-center">No spam. Just your result + next steps.</p>
            </form>
          ) : (
            <div className="bg-[#FFBF00]/10 border border-[#FFBF00]/30 rounded-2xl p-6 text-center space-y-2">
              <p className="text-[#FFBF00] font-bold text-lg">Check your inbox! ✈️</p>
              <p className="text-gray-400 text-sm">Your personalized roadmap is on its way.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default: YES outcome
  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="text-5xl">✈️</div>
          <p className="text-[#FFBF00] text-sm font-semibold tracking-widest uppercase">Your Result</p>
          <h1 className="text-white text-3xl sm:text-4xl font-bold">
            Yes — You Can Be a Pilot!
          </h1>
          <p className="text-gray-400 text-base">
            Based on your answers, you're a great candidate for your Private Pilot Certificate. Here's what your path to the cockpit looks like.
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <p className="text-white font-semibold text-sm">Your Pilot Roadmap</p>
          {[
            { step: "1", label: "Book a Discovery Flight", desc: "Get in the cockpit and feel what it's like — you'll even take the controls.", time: "This week" },
            { step: "2", label: "Get Your FAA Medical", desc: "See an Aviation Medical Examiner (AME) for your 3rd-class medical certificate.", time: "~1–2 weeks" },
            { step: "3", label: "Start Flight Training", desc: "Weekly lessons in a Grumman Cheetah AA-5A with CFII Isaac Prestwich.", time: "Months 1–6" },
            { step: "4", label: "Pass Your Checkride", desc: "Oral exam + practical test. You're now a licensed Private Pilot.", time: "~6–12 months" },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FFBF00] text-black font-bold text-sm flex items-center justify-center">
                {item.step}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <span className="text-[#FFBF00] text-xs bg-[#FFBF00]/15 px-2 py-0.5 rounded-full">{item.time}</span>
                </div>
                <p className="text-gray-400 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Email capture */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-white font-semibold text-sm text-center">Get this roadmap in your inbox</p>
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFBF00]"
              required
            />
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFBF00]"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFBF00] text-black font-bold py-4 rounded-2xl hover:bg-yellow-400 transition-all disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send Me My Roadmap →"}
            </button>
            <p className="text-gray-600 text-xs text-center">No spam. We'll also send info on how to get started with Merlin.</p>
          </form>
        ) : (
          <div className="bg-[#FFBF00]/10 border border-[#FFBF00]/30 rounded-2xl p-6 text-center space-y-2">
            <p className="text-[#FFBF00] font-bold text-lg">Check your inbox! ✈️</p>
            <p className="text-gray-400 text-sm">Your personalized roadmap is on its way. We'll be in touch soon.</p>
          </div>
        )}

        <div className="text-center">
          <Link
            href="https://merlinflighttraining.com/book-discovery"
            className="block w-full bg-white/10 border border-white/20 text-white font-semibold py-4 rounded-2xl hover:bg-white/15 transition-all text-center"
          >
            Book a Discovery Flight Now →
          </Link>
        </div>

        <Link href="/quiz" className="block text-center text-gray-500 text-sm hover:text-gray-300 transition-colors">
          ← Retake the quiz
        </Link>
      </div>
    </div>
  )
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  )
}
