"use client"

import React, { useState } from "react"
import Link from "next/link"

type FormState = {
  name: string
  email: string
  phone: string
  consent: boolean
}

const initialState: FormState = {
  name: "",
  email: "",
  phone: "",
  consent: false,
}

// Format a raw input into US-style (XXX) XXX-XXXX as the user types
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10)
  const len = digits.length
  if (len === 0) return ""
  if (len < 4) return `(${digits}`
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export default function SmsOptInPage() {
  const [form, setForm] = useState<FormState>(initialState)
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target
    if (name === "phone") {
      setForm((prev) => ({ ...prev, phone: formatPhone(value) }))
      return
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage("")

    // Client-side validation
    if (!form.consent) {
      setErrorMessage("You must check the consent box to subscribe to SMS messages.")
      setStatus("error")
      return
    }

    const phoneDigits = form.phone.replace(/\D/g, "")
    if (phoneDigits.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit U.S. mobile number.")
      setStatus("error")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setErrorMessage("Please enter a valid email address.")
      setStatus("error")
      return
    }

    if (!form.name.trim()) {
      setErrorMessage("Please enter your name.")
      setStatus("error")
      return
    }

    setStatus("submitting")

    try {
      const response = await fetch("/api/sms-opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone,
          phoneDigits,
          consent: form.consent,
          consentText:
            "I agree to receive SMS text messages from Merlin Flight Training at the phone number provided above. I understand that message and data rates may apply, message frequency varies, and I can opt out at any time by replying STOP.",
          consentTimestamp: new Date().toISOString(),
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.")
      }

      setStatus("success")
      setForm(initialState)
    } catch (err) {
      setStatus("error")
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      )
    }
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="relative bg-black text-white py-20 sm:py-24 overflow-hidden">
        {/* Subtle decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23FFBF00' fill-opacity='0.3'/%3E%3C/svg%3E")`,
              backgroundSize: "80px 80px",
            }}
          />
        </div>
        {/* Golden glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-golden/10 blur-3xl" />

        <div className="relative z-10 container mx-auto px-4 sm:px-6 max-w-4xl text-center">
          <Link
            href="/"
            className="text-golden hover:text-white transition-colors duration-300 text-sm font-light inline-flex items-center gap-1"
          >
            <span aria-hidden="true">&larr;</span> Back to home
          </Link>
          <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-golden shadow-lg shadow-golden/20">
            {/* Chat bubble icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-black"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Stay in the Loop with <span className="text-golden">SMS Updates</span>
          </h1>
          <p className="mt-5 text-gray-300 font-light text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Never miss a lesson reminder, schedule change, or weather cancellation. Opt in below to
            receive text messages from Merlin Flight Training.
          </p>
          <div className="mt-8 mx-auto h-px w-24 bg-gradient-to-r from-transparent via-golden to-transparent" />
        </div>
      </section>

      {/* Form Section */}
      <section className="relative py-12 sm:py-16 -mt-10">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
            {/* What you'll receive */}
            <aside className="md:col-span-2 order-2 md:order-1">
              <div className="rounded-2xl bg-black text-white p-6 shadow-xl h-full">
                <h2 className="text-lg font-semibold text-golden mb-4">
                  What you&rsquo;ll receive
                </h2>
                <ul className="space-y-3 text-sm font-light text-gray-200">
                  {[
                    "Lesson reminders",
                    "Schedule changes",
                    "Weather cancellations",
                    "Training updates",
                    "Account notifications",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 text-golden flex-shrink-0 mt-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-6 border-t border-white/10 text-xs text-gray-400 font-light leading-relaxed">
                  <p>
                    Message frequency varies. Message and data rates may apply. Reply{" "}
                    <span className="text-golden font-medium">STOP</span> to cancel or{" "}
                    <span className="text-golden font-medium">HELP</span> for help.
                  </p>
                </div>
              </div>
            </aside>

            {/* Form card */}
            <div className="md:col-span-3 order-1 md:order-2">
              <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100 p-6 sm:p-8">
                {status === "success" ? (
                  <div className="text-center py-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-golden/10">
                      <svg
                        className="h-10 w-10 text-golden"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <h2 className="mt-6 text-2xl font-bold text-darkText">You&rsquo;re all set!</h2>
                    <p className="mt-3 text-gray-600 font-light leading-relaxed">
                      Thanks for opting in. You&rsquo;ll now receive SMS updates from Merlin
                      Flight Training. Remember, you can reply{" "}
                      <span className="font-medium text-darkText">STOP</span> at any time to
                      unsubscribe.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="mt-6 inline-flex items-center justify-center rounded-lg bg-golden px-5 py-2.5 text-sm font-semibold text-black hover:bg-golden/90 transition-colors duration-300"
                    >
                      Submit another number
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-darkText">Opt in to SMS</h2>
                      <p className="mt-1 text-sm text-gray-500 font-light">
                        All fields are required.
                      </p>
                    </div>

                    {/* Name */}
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-darkText mb-1"
                      >
                        Full name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Jane Doe"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-darkText placeholder-gray-400 shadow-sm focus:border-golden focus:outline-none focus:ring-2 focus:ring-golden/40 transition"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-darkText mb-1"
                      >
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-darkText placeholder-gray-400 shadow-sm focus:border-golden focus:outline-none focus:ring-2 focus:ring-golden/40 transition"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-darkText mb-1"
                      >
                        Mobile phone number
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel-national"
                        inputMode="tel"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="(555) 555-1234"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-darkText placeholder-gray-400 shadow-sm focus:border-golden focus:outline-none focus:ring-2 focus:ring-golden/40 transition"
                      />
                      <p className="mt-1 text-xs text-gray-500 font-light">
                        U.S. mobile numbers only.
                      </p>
                    </div>

                    {/* Required consent */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <label htmlFor="consent" className="flex gap-3 items-start cursor-pointer">
                        <input
                          id="consent"
                          name="consent"
                          type="checkbox"
                          required
                          checked={form.consent}
                          onChange={handleChange}
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-golden focus:ring-golden/40 cursor-pointer"
                        />
                        <span className="text-sm text-darkText font-light leading-relaxed">
                          I agree to receive SMS text messages from Merlin Flight Training at the
                          phone number provided above. I understand that message and data rates
                          may apply, message frequency varies, and I can opt out at any time by
                          replying <span className="font-semibold">STOP</span>.
                        </span>
                      </label>
                    </div>

                    {/* Legal */}
                    <p className="text-xs text-gray-500 font-light leading-relaxed">
                      By submitting this form you also agree to our{" "}
                      <Link
                        href="/terms"
                        className="text-golden hover:underline font-medium"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="text-golden hover:underline font-medium"
                      >
                        Privacy Policy
                      </Link>
                      . Consent to receive SMS messages is not a condition of purchase. You may
                      revoke consent at any time by replying{" "}
                      <span className="font-semibold text-darkText">STOP</span> to any message or
                      by contacting us directly at{" "}
                      <a
                        href="mailto:merlinflighttraining@gmail.com"
                        className="text-golden hover:underline font-medium"
                      >
                        merlinflighttraining@gmail.com
                      </a>
                      .
                    </p>

                    {/* Error message */}
                    {status === "error" && errorMessage && (
                      <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                      >
                        {errorMessage}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={!form.consent || status === "submitting"}
                      className="w-full inline-flex items-center justify-center rounded-lg bg-golden px-5 py-3 text-base font-semibold text-black shadow-lg shadow-golden/20 hover:bg-golden/90 focus:outline-none focus:ring-2 focus:ring-golden/40 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {status === "submitting" ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-5 w-5 text-black"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            />
                          </svg>
                          Subscribing&hellip;
                        </>
                      ) : (
                        "Subscribe to SMS updates"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
