'use client'

import Link from "next/link"
import { useState } from "react"
import type { Metadata } from "next"
import ContactModal from "@/app/components/ContactModal"

// Note: Metadata for client components should be defined in a parent layout.tsx or using generateMetadata
// This is here for reference but will be handled through dynamic metadata generation

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-golden/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left bg-white hover:bg-gray-50/50 transition-colors"
      >
        <h3 className="text-base sm:text-lg font-semibold text-black pr-4">{question}</h3>
        <svg
          className={`w-5 h-5 text-golden flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-gray-600 leading-relaxed text-sm sm:text-base">
            {answer}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [selectedAircraft, setSelectedAircraft] = useState<string | undefined>()
  const instructionRate = 65
  const aircraftRate = 185
  const cardFeeRate = 0.035
  const aircraftCardRate = Number((aircraftRate * (1 + cardFeeRate)).toFixed(2))
  const formatCurrency = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const privateFlightHours = 60
  const privateInstructionHours = 84
  const privateBundleTotal = 3013
  const privateCardTotal = (privateFlightHours * aircraftCardRate) + (privateInstructionHours * instructionRate) + privateBundleTotal
  const privateCashTotal = (privateFlightHours * aircraftRate) + (privateInstructionHours * instructionRate) + privateBundleTotal

  const instrumentFlightHours = 50
  const instrumentInstructionHours = 70
  const instrumentExamCosts = 1175
  const instrumentCardTotal = (instrumentFlightHours * aircraftCardRate) + (instrumentInstructionHours * instructionRate) + instrumentExamCosts
  const instrumentCashTotal = (instrumentFlightHours * aircraftRate) + (instrumentInstructionHours * instructionRate) + instrumentExamCosts

  const commercialFlightHours = 120
  const commercialInstructionHours = 168
  const commercialExamCosts = 1175
  const commercialCardTotal = (commercialFlightHours * aircraftCardRate) + (commercialInstructionHours * instructionRate) + commercialExamCosts
  const commercialCashTotal = (commercialFlightHours * aircraftRate) + (commercialInstructionHours * instructionRate) + commercialExamCosts

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-16 overflow-hidden" style={{
          backgroundImage: `url('/images/our-aircraft-header.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 60%',
          backgroundAttachment: 'fixed',
        }}>
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <div className="mb-4 inline-block">
              <div className="w-16 sm:w-20 h-1 bg-golden mx-auto rounded-full" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              Our <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Pricing</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
              Transparent, competitive rates for flight training and aircraft rental
            </p>
          </div>
        </section>

        {/* Discovery Flight CTA Section */}
        <section className="py-12 sm:py-16 bg-golden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-black/60 font-semibold text-sm uppercase tracking-widest mb-1">Start Here</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-2">Discovery Flight</h2>
                <p className="text-black/70 text-base sm:text-lg max-w-xl">
                  Your first hour in the air. No experience needed — Isaac handles everything. See Manhattan from above and decide if flying is for you.
                </p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-4 flex-shrink-0">
                <div className="text-left md:text-right">
                  <p className="text-black/60 text-sm font-medium">Starting at</p>
                  <p className="text-4xl sm:text-5xl font-bold text-black">$265</p>
                  <p className="text-black/60 text-sm">~90 min · Republic Airport (FRG)</p>
                </div>
                <Link
                  href="/discovery-flight-funnel"
                  className="px-8 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors text-base whitespace-nowrap"
                >
                  Book Now →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Two-Column Rate Cards */}
        <section className="py-16 sm:py-20 md:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 tracking-tight">
                Base Rates
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto font-light">
                Simple hourly pricing — no hidden fees, no block-hour requirements
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              {/* Aircraft Rate Card */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-8 sm:p-10 hover:shadow-lg hover:border-golden/30 transition-all duration-300">
                <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-1">Aircraft Rental</h3>
                <p className="text-sm text-gray-500 mb-5">N9725U · FRG</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl sm:text-5xl font-bold text-golden">${aircraftRate}</span>
                  <span className="text-gray-500 text-lg">/hr</span>
                </div>
                <p className="text-xs text-gray-500 mb-6">3.5% fee applies to card payments (${formatCurrency(aircraftCardRate)}/hr)</p>
                <div className="space-y-3 text-sm text-gray-600">
                  {['Fuel and oil included', 'Maintenance and inspections', 'Insurance coverage', 'Modern glass avionics', 'Hangar fees included'].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-golden flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instruction Rate Card */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-8 sm:p-10 hover:shadow-lg hover:border-golden/30 transition-all duration-300">
                <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-1">Flight Instruction</h3>
                <p className="text-sm text-gray-500 mb-5">Same rate for flight and ground time</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl sm:text-5xl font-bold text-golden">${instructionRate}</span>
                  <span className="text-gray-500 text-lg">/hr</span>
                </div>
                <p className="text-xs text-gray-500 mb-6">FAA-certified, one-on-one personalized training</p>
                <div className="space-y-3 text-sm text-gray-600">
                  {['Customized training plan', 'Ground school support', 'Exam preparation guidance', 'Flexible scheduling', 'All certificate levels'].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-golden flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* What to Expect callout */}
            <div className="max-w-4xl mx-auto mt-8">
              <div className="bg-golden/5 border border-golden/20 p-5 sm:p-6 rounded-xl flex gap-3 sm:gap-4 items-start">
                <svg className="w-5 h-5 text-golden mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-700 text-sm leading-relaxed">
                  <span className="font-semibold text-black">Typical lesson:</span> A 2-hour flight includes ~20–30 min of ground instruction for preflight prep and post-flight review, resulting in ~2.4–2.6 hours of total instruction billed.
                </p>
              </div>
            </div>

            <div className="text-center mt-10">
              <Link
                href="https://app.merlinflighttraining.com/schedule"
                className="inline-block px-10 py-4 bg-black text-white font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300 text-base"
              >
                Schedule a Lesson
              </Link>
            </div>
          </div>
        </section>

        {/* Training Program Estimates */}
        <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 tracking-tight">
                Training Program <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Estimates</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto font-light">
                Full cost breakdowns from zero experience to certificate in hand
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
              {/* Private Pilot */}
              <div className="relative bg-white rounded-2xl border-2 border-golden shadow-lg overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 right-0 bg-golden text-black text-xs font-bold text-center py-1.5 uppercase tracking-wider">
                  Most Popular
                </div>
                <div className="p-6 sm:p-7 pt-10 flex flex-col flex-1">
                  <h4 className="text-lg font-bold text-black mb-1">Private Pilot</h4>
                  <p className="text-xs text-gray-500 mb-5">{privateFlightHours} flight hrs · {privateInstructionHours} instruction hrs</p>

                  <div className="space-y-2.5 text-sm mb-6 flex-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Instruction</span>
                      <span>${(privateInstructionHours * instructionRate).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Aircraft</span>
                      <span>${formatCurrency(privateFlightHours * aircraftRate)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Equipment + exams</span>
                      <span>${privateBundleTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-semibold text-black">Total (Cash)</span>
                      <span className="text-2xl font-bold text-golden">${privateCashTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-500">Total (Card)</span>
                      <span className="text-sm text-gray-500">${privateCardTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instrument */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-golden/30 transition-all duration-300 flex flex-col">
                <div className="p-6 sm:p-7 flex flex-col flex-1">
                  <h4 className="text-lg font-bold text-black mb-1">Instrument Rating</h4>
                  <p className="text-xs text-gray-500 mb-5">{instrumentFlightHours} flight hrs · {instrumentInstructionHours} instruction hrs</p>

                  <div className="space-y-2.5 text-sm mb-6 flex-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Instruction</span>
                      <span>${(instrumentInstructionHours * instructionRate).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Aircraft</span>
                      <span>${formatCurrency(instrumentFlightHours * aircraftRate)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Checkride + written</span>
                      <span>${instrumentExamCosts.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-semibold text-black">Total (Cash)</span>
                      <span className="text-2xl font-bold text-golden">${instrumentCashTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-500">Total (Card)</span>
                      <span className="text-sm text-gray-500">${instrumentCardTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commercial */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-golden/30 transition-all duration-300 flex flex-col">
                <div className="p-6 sm:p-7 flex flex-col flex-1">
                  <h4 className="text-lg font-bold text-black mb-1">Commercial Pilot</h4>
                  <p className="text-xs text-gray-500 mb-5">{commercialFlightHours} flight hrs · {commercialInstructionHours} instruction hrs</p>

                  <div className="space-y-2.5 text-sm mb-6 flex-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Instruction</span>
                      <span>${(commercialInstructionHours * instructionRate).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Aircraft</span>
                      <span>${formatCurrency(commercialFlightHours * aircraftRate)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Checkride + written</span>
                      <span>${commercialExamCosts.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-semibold text-black">Total (Cash)</span>
                      <span className="text-2xl font-bold text-golden">${commercialCashTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-500">Total (Card)</span>
                      <span className="text-sm text-gray-500">${commercialCardTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Training */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-golden/30 transition-all duration-300 flex flex-col">
                <div className="p-6 sm:p-7 flex flex-col flex-1">
                  <h4 className="text-lg font-bold text-black mb-1">Additional Training</h4>
                  <p className="text-xs text-gray-500 mb-5">Pay-as-you-go hourly rates</p>

                  <div className="space-y-2.5 text-sm mb-6 flex-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Flight instruction</span>
                      <span className="font-medium text-black">${instructionRate}/hr</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Ground instruction</span>
                      <span className="font-medium text-black">${instructionRate}/hr</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Aircraft (cash)</span>
                      <span className="font-medium text-black">${formatCurrency(aircraftRate)}/hr</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Aircraft (card)</span>
                      <span className="font-medium text-black">${formatCurrency(aircraftCardRate)}/hr</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Refresher flights, checkride prep, endorsements, and proficiency work — billed by the hour.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-6 text-center max-w-2xl mx-auto">
              CFI certification isn&apos;t just a rating — it&apos;s your entry to a paid flying career.
              Merlin hires from within.{' '}
              <Link href="/careers" className="text-golden font-medium underline-offset-2 hover:underline">
                See how →
              </Link>
            </p>
          </div>
        </section>

        {/* Payment Options Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-black text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px',
            }} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-12 sm:mb-14">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                Flexible <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Payment</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto font-light">
                Multiple ways to pay — choose what works best for you
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 text-center hover:border-golden/30 transition-all duration-300">
                <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Credit & Debit Cards</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Visa, Mastercard, Amex — securely processed through Stripe. 3.5% fee on aircraft rental.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 text-center hover:border-golden/30 transition-all duration-300">
                <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Apple Pay</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Tap to pay on compatible devices and browsers. Fast, secure, and convenient.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 text-center hover:border-golden/30 transition-all duration-300">
                <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Payment Plans</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Financing available through Affirm (subject to eligibility). Transparent billing, no surprises.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 tracking-tight">
                Common <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Questions</span>
              </h2>
            </div>

            <div className="space-y-3">
              <FAQItem
                question="Are there any hidden fees?"
                answer="No. Aircraft and instruction are billed separately by the hour so you can see exactly what you are paying for. Aircraft rental includes fuel, maintenance, and insurance."
              />
              <FAQItem
                question="Do I need a medical certificate?"
                answer="For discovery flights and recreational flying, you do not need a medical certificate. For commercial training or pilot certification, an FAA medical certificate is required."
              />
              <FAQItem
                question="Can I cancel or reschedule?"
                answer="Yes. We offer flexible rescheduling based on instructor and aircraft availability. Please contact us for our cancellation policy details."
              />
              <FAQItem
                question="How does billing work?"
                answer="Training is billed hourly: $65/hr for instruction and $185.00/hr for N9725U aircraft time. A 3.5% fee applies to card purchases. No block-hour pricing."
              />
              <FAQItem
                question="What about fuel surcharges?"
                answer="We are currently charging a temporary $8.50/hr fuel surcharge due to ongoing oil prices rising."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-24 md:py-32 bg-black text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px',
            }} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black opacity-80" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <div className="mb-6 inline-block">
              <div className="w-16 sm:w-20 h-1 bg-golden mx-auto rounded-full" />
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              Ready to <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Start Flying</span>?
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
              Schedule your discovery flight or training session today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="https://app.merlinflighttraining.com/schedule"
                className="inline-block px-10 py-4 font-bold text-lg bg-golden text-darkText rounded-lg hover:bg-opacity-90 transition-all duration-300"
              >
                Schedule Now
              </Link>
              <button
                onClick={() => {
                  setSelectedAircraft("Flight Inquiry")
                  setIsContactOpen(true)
                }}
                className="inline-block px-10 py-4 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-all duration-300 border-2 border-white/30 hover:border-golden"
              >
                Contact Us
              </button>
            </div>
          </div>
        </section>
      </div>

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        aircraftName={selectedAircraft}
      />
    </>
  )
}
