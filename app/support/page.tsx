"use client"

import { useState } from "react"
import Link from "next/link"

const CATEGORIES = [
  { value: "scheduling", label: "Scheduling & Booking" },
  { value: "billing", label: "Billing & Payments" },
  { value: "training", label: "Training Questions" },
  { value: "medical", label: "Medical Certificates" },
  { value: "aircraft", label: "Aircraft & Equipment" },
  { value: "other", label: "Other" },
]

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    subject: "",
    message: "",
  })
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("submitting")
    setErrorMsg("")

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setStatus("success")
        setFormData({ name: "", email: "", phone: "", category: "", subject: "", message: "" })
      } else {
        const data = await response.json()
        setErrorMsg(data.error || "Something went wrong. Please try again.")
        setStatus("error")
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.")
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative py-20 sm:py-24 md:py-32 bg-black overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
            backgroundSize: "100px 100px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-6 inline-block">
            <div className="w-16 sm:w-20 h-1 bg-golden mx-auto rounded-full" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            Support &amp;{" "}
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Contact
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
            We&apos;re here to help. Reach out and we&apos;ll get back to you within 72 hours.
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Hours */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Business Hours</h3>
              <p className="text-gray-900 font-medium">Mon – Sat</p>
              <p className="text-gray-700">7:00 AM – 7:00 PM</p>
              <p className="text-gray-500 text-sm mt-1">Closed Sundays</p>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</h3>
              <p className="text-gray-900 font-medium">Republic Airport</p>
              <p className="text-gray-700 text-sm">208 NY-109 Suite 201-8</p>
              <p className="text-gray-700 text-sm">Farmingdale, NY 11735</p>
            </div>

            {/* Email */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</h3>
              <a
                href="mailto:merlinflighttraining@gmail.com"
                className="text-golden hover:underline text-sm break-all font-medium"
              >
                merlinflighttraining@gmail.com
              </a>
              <p className="text-gray-500 text-sm mt-2">Response within 72 hours</p>
            </div>

            {/* Phone */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Phone</h3>
              <a
                href="tel:+19294874717"
                className="text-golden hover:underline font-medium"
              >
                +1 (929) 487-4717
              </a>
              <p className="text-gray-500 text-sm mt-2">During business hours</p>
            </div>
          </div>
        </div>
      </section>

      {/* Support Categories */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              What can we help you with?
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Browse our resources below or submit a ticket and we&apos;ll get back to you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <Link
              href="/schedule"
              className="group bg-gray-50 hover:bg-golden/5 border border-gray-100 hover:border-golden/40 rounded-2xl p-6 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-golden/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-golden/20 transition-colors">
                <svg className="w-5 h-5 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-golden transition-colors">Scheduling &amp; Booking</h3>
              <p className="text-gray-500 text-sm">Schedule lessons, rescheduling, cancellations, and availability.</p>
            </Link>

            <Link
              href="/pricing"
              className="group bg-gray-50 hover:bg-golden/5 border border-gray-100 hover:border-golden/40 rounded-2xl p-6 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-golden/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-golden/20 transition-colors">
                <svg className="w-5 h-5 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-golden transition-colors">Billing &amp; Payments</h3>
              <p className="text-gray-500 text-sm">Invoices, block hour rates, payment methods, and receipts.</p>
            </Link>

            <Link
              href="/faq"
              className="group bg-gray-50 hover:bg-golden/5 border border-gray-100 hover:border-golden/40 rounded-2xl p-6 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-golden/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-golden/20 transition-colors">
                <svg className="w-5 h-5 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-golden transition-colors">Training Questions</h3>
              <p className="text-gray-500 text-sm">Curriculum, certificates, syllabus, and training plans. See our FAQ.</p>
            </Link>

            <Link
              href="/faq"
              className="group bg-gray-50 hover:bg-golden/5 border border-gray-100 hover:border-golden/40 rounded-2xl p-6 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-golden/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-golden/20 transition-colors">
                <svg className="w-5 h-5 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-golden transition-colors">Medical Certificates</h3>
              <p className="text-gray-500 text-sm">FAA medical requirements, AME referrals, and waivers.</p>
            </Link>

            <Link
              href="/aircraft"
              className="group bg-gray-50 hover:bg-golden/5 border border-gray-100 hover:border-golden/40 rounded-2xl p-6 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-golden/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-golden/20 transition-colors">
                <svg className="w-5 h-5 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-golden transition-colors">Aircraft &amp; Equipment</h3>
              <p className="text-gray-500 text-sm">Questions about our fleet, rental rates, and equipment.</p>
            </Link>

            <Link
              href="/faq"
              className="group bg-gray-50 hover:bg-golden/5 border border-gray-100 hover:border-golden/40 rounded-2xl p-6 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-golden/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-golden/20 transition-colors">
                <svg className="w-5 h-5 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-golden transition-colors">General FAQ</h3>
              <p className="text-gray-500 text-sm">Browse our frequently asked questions for quick answers.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Submit a Support Ticket</h2>
            <p className="text-gray-500">
              Fill out the form below and we&apos;ll respond within{" "}
              <span className="font-semibold text-gray-700">72 hours</span>.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {status === "success" ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ticket Submitted!</h3>
                <p className="text-gray-500 mb-6">
                  We&apos;ve received your message. You can expect a reply within 72 hours during business hours
                  (Mon–Sat, 7 AM–7 PM).
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === "error" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Smith"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-golden/50 focus:border-golden transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-golden/50 focus:border-golden transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-golden/50 focus:border-golden transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-golden/50 focus:border-golden transition-colors bg-white"
                    >
                      <option value="" disabled>Select a category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief summary of your issue"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-golden/50 focus:border-golden transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Please describe your question or issue in as much detail as possible..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-golden/50 focus:border-golden transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full bg-black text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "submitting" ? "Submitting…" : "Submit Support Ticket"}
                </button>

                <p className="text-center text-xs text-gray-400">
                  We respond within 72 hours · Mon–Sat, 7 AM–7 PM · Closed Sundays
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-12 sm:py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Additional Resources</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Frequently Asked Questions
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Blog &amp; Guides
            </Link>
            <Link
              href="/aircraft"
              className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Our Aircraft
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Schedule a Flight
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
