'use client'

import Link from "next/link"
import { useState } from "react"
import type { Metadata } from "next"
import ContactModal from "@/app/components/ContactModal"

// Note: Metadata for client components should be defined in a parent layout.tsx or using generateMetadata
// This is here for reference but will be handled through dynamic metadata generation

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
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px',
            }} />
          </div>
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

        {/* Aircraft Pricing Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16 md:mb-20">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 tracking-tight">
                Aircraft Fleet Pricing
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
                Choose from our modern, well-maintained aircraft at competitive rates
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-8 sm:p-10 md:p-12">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 pb-6 border-b border-gray-200">
                    <div className="mb-4 md:mb-0">
                      <h3 className="text-2xl sm:text-3xl font-bold text-black mb-2">N2152Z Piper Warrior</h3>
                      <p className="text-golden font-semibold text-lg sm:text-xl mb-1">FRG - Republic Airport</p>
                        <p className="text-gray-600 font-medium">208 NY-109, Farmingdale, NY 11735</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm text-gray-500 mb-1">Hourly Rate</p>
                      <p className="text-3xl sm:text-4xl font-bold text-golden">${formatCurrency(aircraftRate)}<span className="text-base text-gray-500"> per hr</span></p>
                      <p className="text-xs text-gray-500 mt-2">3.5% fee applies to card purchases.</p>
                    </div>
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-6 font-light text-sm sm:text-base">
                    Premium training platform with new array of avionics and glass instruments. Ideal for Private Pilot, Instrument Pilot, and Commercial Pilot training with modern interior.
                  </p>

                  <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl">
                    <h4 className="font-semibold text-black mb-4 text-lg">Pricing</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-golden/10 rounded-lg border border-golden/20">
                        <span className="text-gray-700 font-medium">Aircraft Rate</span>
                        <span className="font-bold text-golden text-lg">${formatCurrency(aircraftRate)}/hr</span>
                      </div>
                      <p className="text-sm text-gray-600">3.5% fee applies to card purchases.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Instructor Rates Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-gray-50 to-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16 md:mb-20">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 tracking-tight">
                Flight Instruction Rates
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
                Professional FAA-certified instruction designed to meet your goals
              </p>
            </div>

            <div className="max-w-4xl mx-auto mb-12">
              {/* Instruction Rate Card */}
              <div className="bg-white p-8 sm:p-10 md:p-12 rounded-3xl shadow-xl border border-gray-200 hover:border-golden transition-all duration-300">
                <div className="text-center mb-8">
                  <h3 className="text-2xl sm:text-3xl font-bold text-black mb-2">Flight Instruction</h3>
                  <p className="text-gray-600 font-light">
                    One-on-one personalized training with FAA-certified instructors
                  </p>
                </div>
                
                {/* Rate Display */}
                <div className="text-center mb-8 pb-8 border-b border-gray-200">
                  <p className="text-5xl sm:text-6xl font-bold text-golden mb-2">$65<span className="text-xl text-gray-500">/hr</span></p>
                  <p className="text-gray-600 font-light">Same rate for flight and ground instruction</p>
                </div>

                {/* Pricing Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-6 rounded-2xl">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-golden/10 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-black">Flight Time</h4>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Instruction time while in the aircraft. Billed based on Hobbs time.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-golden/10 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-black">Ground Time</h4>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Preflight briefings, post-flight debriefs, and ground school sessions.
                    </p>
                  </div>
                </div>

                {/* Example Box */}
                <div className="bg-golden/5 border border-golden/20 p-6 rounded-2xl mb-8">
                  <h4 className="font-semibold text-black mb-3 flex items-center">
                    <svg className="w-5 h-5 text-golden mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    What to Expect
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    A typical lesson includes flight time plus 20–30 minutes of ground instruction for preflight preparation and post-flight review. For example, a 2.0-hour flight would typically result in 2.4–2.6 hours of total instruction time billed.
                  </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-golden mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 text-sm">Flexible scheduling</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-golden mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 text-sm">Personalized training</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-golden mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 text-sm">All certificate levels</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-golden mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 text-sm">FAA-certified instructors</span>
                  </div>
                </div>

                <Link
                  href="/schedule"
                  className="w-full px-6 py-4 bg-black text-white font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300 transform hover:scale-105 text-center"
                >
                  Schedule a Lesson
                </Link>
              </div>
            </div>

            {/* Training Programs */}
            <div className="mt-12 sm:mt-16">
              <h3 className="text-2xl sm:text-3xl font-bold text-black mb-8 text-center">Training Program Costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8">
                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <h4 className="text-lg sm:text-xl font-bold text-black mb-4">Private Pilot</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="flex justify-between"><span>Flight hours</span><span>{privateFlightHours} hrs</span></p>
                    <p className="flex justify-between"><span>Instruction hours</span><span>{privateInstructionHours} hrs</span></p>
                    <p className="flex justify-between"><span>Instruction ({privateInstructionHours} x ${instructionRate})</span><span>${(privateInstructionHours * instructionRate).toLocaleString()}</span></p>
                    <p className="flex justify-between"><span>Aircraft + 3.5% card fee ({privateFlightHours} x ${formatCurrency(aircraftCardRate)})</span><span>${formatCurrency(privateFlightHours * aircraftCardRate)}</span></p>
                    <p className="flex justify-between"><span>Aircraft cash ({privateFlightHours} x ${formatCurrency(aircraftRate)})</span><span>${formatCurrency(privateFlightHours * aircraftRate)}</span></p>
                    <p className="flex justify-between"><span>Equipment + checkride + written</span><span>${privateBundleTotal.toLocaleString()}</span></p>
                    <p className="flex justify-between font-semibold border-t border-gray-200 pt-2"><span>Total (Card)</span><span className="text-golden">${privateCardTotal.toLocaleString()}</span></p>
                    <p className="flex justify-between font-semibold"><span>Total (Cash)</span><span className="text-golden">${privateCashTotal.toLocaleString()}</span></p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <h4 className="text-lg sm:text-xl font-bold text-black mb-4">Instrument</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="flex justify-between"><span>Flight hours</span><span>{instrumentFlightHours} hrs</span></p>
                    <p className="flex justify-between"><span>Instruction hours</span><span>{instrumentInstructionHours} hrs</span></p>
                    <p className="flex justify-between"><span>Instruction ({instrumentInstructionHours} x ${instructionRate})</span><span>${(instrumentInstructionHours * instructionRate).toLocaleString()}</span></p>
                    <p className="flex justify-between"><span>Aircraft + 3.5% card fee ({instrumentFlightHours} x ${formatCurrency(aircraftCardRate)})</span><span>${formatCurrency(instrumentFlightHours * aircraftCardRate)}</span></p>
                    <p className="flex justify-between"><span>Aircraft cash ({instrumentFlightHours} x ${formatCurrency(aircraftRate)})</span><span>${formatCurrency(instrumentFlightHours * aircraftRate)}</span></p>
                    <p className="flex justify-between"><span>Checkride + written</span><span>${instrumentExamCosts.toLocaleString()}</span></p>
                    <p className="flex justify-between font-semibold border-t border-gray-200 pt-2"><span>Total (Card)</span><span className="text-golden">${instrumentCardTotal.toLocaleString()}</span></p>
                    <p className="flex justify-between font-semibold"><span>Total (Cash)</span><span className="text-golden">${instrumentCashTotal.toLocaleString()}</span></p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <h4 className="text-lg sm:text-xl font-bold text-black mb-4">Commercial</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="flex justify-between"><span>Flight hours</span><span>{commercialFlightHours} hrs</span></p>
                    <p className="flex justify-between"><span>Instruction hours</span><span>{commercialInstructionHours} hrs</span></p>
                    <p className="flex justify-between"><span>Instruction ({commercialInstructionHours} x ${instructionRate})</span><span>${(commercialInstructionHours * instructionRate).toLocaleString()}</span></p>
                    <p className="flex justify-between"><span>Aircraft + 3.5% card fee ({commercialFlightHours} x ${formatCurrency(aircraftCardRate)})</span><span>${formatCurrency(commercialFlightHours * aircraftCardRate)}</span></p>
                    <p className="flex justify-between"><span>Aircraft cash ({commercialFlightHours} x ${formatCurrency(aircraftRate)})</span><span>${formatCurrency(commercialFlightHours * aircraftRate)}</span></p>
                    <p className="flex justify-between"><span>Checkride + written</span><span>${commercialExamCosts.toLocaleString()}</span></p>
                    <p className="flex justify-between font-semibold border-t border-gray-200 pt-2"><span>Total (Card)</span><span className="text-golden">${commercialCardTotal.toLocaleString()}</span></p>
                    <p className="flex justify-between font-semibold"><span>Total (Cash)</span><span className="text-golden">${commercialCashTotal.toLocaleString()}</span></p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <h4 className="text-lg sm:text-xl font-bold text-black mb-4">Additional Training</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="flex justify-between"><span>Flight instruction</span><span>${instructionRate}/hr</span></p>
                    <p className="flex justify-between"><span>Ground instruction</span><span>${instructionRate}/hr</span></p>
                    <p className="flex justify-between"><span>Aircraft + 3.5% card fee</span><span>${formatCurrency(aircraftCardRate)}/hr</span></p>
                    <p className="flex justify-between"><span>Aircraft (cash)</span><span>${formatCurrency(aircraftRate)}/hr</span></p>
                    <p className="pt-2 border-t border-gray-200 text-gray-600">
                      Refresher flights, checkride prep, endorsements, and proficiency work are billed strictly by the hour.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What's Included Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-black text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px',
            }} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
                What's <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Included</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
                Our rates are all-inclusive. No hidden fees or surprise charges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
              <div className="bg-gradient-to-br from-gray-900 to-black p-8 sm:p-10 rounded-2xl border border-golden/20">
                <h3 className="text-xl sm:text-2xl font-bold text-golden mb-6">Aircraft Rental Rate Includes</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">Fuel and oil</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">Maintenance and inspections</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">Insurance coverage</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">Modern avionics and equipment</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">Hangar fees</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-black p-8 sm:p-10 rounded-2xl border border-golden/20">
                <h3 className="text-xl sm:text-2xl font-bold text-golden mb-6">Instruction Rate Includes</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">FAA-certified instruction</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">Flight and ground instruction billed at the same hourly rate</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">Customized training plan</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">Ground school support</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-200 font-light text-sm sm:text-base">Exam preparation guidance</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Options Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-6 tracking-tight">
                Flexible Payment <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Options</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
              <div className="bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 rounded-2xl border border-gray-200">
                <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-4">Credit Cards + Apple Pay</h3>
                <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                  We accept major credit cards, debit cards, and Apple Pay. Payments are securely processed through Stripe on compatible devices and browsers.
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 rounded-2xl border border-gray-200">
                <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-4">Payment Plans Available</h3>
                <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                  We can offer payment plans through providers such as Affirm (subject to eligibility), while keeping billing transparent: instruction is $65/hr, aircraft is $185.00/hr, and a 3.5% fee applies to card purchases.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-6 tracking-tight">
                Pricing <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">FAQs</span>
              </h2>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold text-golden mb-3">Are there any hidden fees?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  No. Aircraft and instruction are billed separately by the hour so you can see exactly what you are paying for. Aircraft rental includes fuel, maintenance, and insurance.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold text-golden mb-3">Do I need a medical certificate?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  For discovery flights and recreational flying, you do not need a medical certificate. For commercial training or pilot certification, an FAA medical certificate is required.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold text-golden mb-3">Can I cancel or reschedule?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  Yes. We offer flexible rescheduling based on instructor and aircraft availability. Please contact us for our cancellation policy details.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold text-golden mb-3">How does billing work now?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  We no longer use block-hour pricing. Training is billed hourly: $65/hr for instruction and $185.00/hr for N2152Z aircraft time. A 3.5% fee applies to card purchases.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold text-golden mb-3">What about fuel surcharges?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  We are currently charging a temporary $8.50/hr fuel surcharge due to ongoing oil prices rising.
                </p>
              </div>
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
                href="/schedule"
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
