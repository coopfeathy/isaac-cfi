'use client'

import Link from "next/link"
import { useState } from "react"
import ContactModal from "@/app/components/ContactModal"

export default function PricingPage() {
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [selectedAircraft, setSelectedAircraft] = useState<string | undefined>()

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative py-20 sm:py-24 md:py-32 overflow-hidden" style={{
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
            <div className="mb-6 inline-block">
              <div className="w-16 sm:w-20 h-1 bg-golden mx-auto rounded-full" />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Our <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Pricing</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
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

            <div className="space-y-8 sm:space-y-10 md:space-y-12">
              {/* N888MS Sport Cruiser */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-8 sm:p-10 md:p-12">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 pb-6 border-b border-gray-200">
                    <div className="mb-4 md:mb-0">
                      <h3 className="text-2xl sm:text-3xl font-bold text-black mb-2">N888MS Sport Cruiser</h3>
                      <p className="text-golden font-semibold text-lg sm:text-xl mb-1">N14 - Flying W Airport</p>
                      <p className="text-gray-600 font-medium">Lumberton, New Jersey</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm text-gray-500 mb-1">Starting Rate</p>
                      <p className="text-3xl sm:text-4xl font-bold text-golden">$147.50<span className="text-base text-gray-500">/hr</span></p>
                    </div>
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-6 font-light text-sm sm:text-base">
                    Perfect for cross-country experience and advanced maneuvers. Equipped with glass cockpit avionics for a modern training experience with cruise speeds exceeding 100 knots.
                  </p>

                  <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl">
                    <h4 className="font-semibold text-black mb-4 text-lg">Pricing</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-700 font-medium">1 Hour</span>
                        <span className="font-bold text-black text-lg">$152.50</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-golden/10 rounded-lg border border-golden/20">
                        <span className="text-gray-700 font-medium">10 Hour Block</span>
                        <span className="font-bold text-golden text-lg">$147.50/hr</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* N2152Z Piper Warrior */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-8 sm:p-10 md:p-12">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 pb-6 border-b border-gray-200">
                    <div className="mb-4 md:mb-0">
                      <h3 className="text-2xl sm:text-3xl font-bold text-black mb-2">N2152Z Piper Warrior</h3>
                      <p className="text-golden font-semibold text-lg sm:text-xl mb-1">FRG - Republic Airport</p>
                      <p className="text-gray-600 font-medium">Farmingdale, New York</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm text-gray-500 mb-1">Starting Rate</p>
                      <p className="text-3xl sm:text-4xl font-bold text-golden">$185<span className="text-base text-gray-500">/hr</span></p>
                    </div>
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-6 font-light text-sm sm:text-base">
                    Premium training platform with new array of avionics and glass instruments. Ideal for Private Pilot, Instrument Pilot, and Commercial Pilot training with modern interior.
                  </p>

                  <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl">
                    <h4 className="font-semibold text-black mb-4 text-lg">Pricing</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-700 font-medium">1 Hour</span>
                        <span className="font-bold text-black text-lg">$190</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-golden/10 rounded-lg border border-golden/20">
                        <span className="text-gray-700 font-medium">10 Hour Block</span>
                        <span className="font-bold text-golden text-lg">$185/hr</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* N1624Q Cessna 150 */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-8 sm:p-10 md:p-12">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 pb-6 border-b border-gray-200">
                    <div className="mb-4 md:mb-0">
                      <h3 className="text-2xl sm:text-3xl font-bold text-black mb-2">N1624Q Cessna 150</h3>
                      <p className="text-golden font-semibold text-lg sm:text-xl mb-1">N72 - Warwick Municipal Airport</p>
                      <p className="text-gray-600 font-medium">Warwick, New York</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm text-gray-500 mb-1">Starting Rate</p>
                      <p className="text-3xl sm:text-4xl font-bold text-golden">$150<span className="text-base text-gray-500">/hr</span></p>
                    </div>
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-6 font-light text-sm sm:text-base">
                    Classic training aircraft with 6-pack steam gauge instruments. Perfect for Private Pilot and Commercial Pilot maneuvers at the most competitive rate.
                  </p>

                  <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl">
                    <h4 className="font-semibold text-black mb-4 text-lg">Pricing</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-700 font-medium">1 Hour</span>
                        <span className="font-bold text-black text-lg">$155</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-golden/10 rounded-lg border border-golden/20">
                        <span className="text-gray-700 font-medium">10 Hour Block</span>
                        <span className="font-bold text-golden text-lg">$150/hr</span>
                      </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 mb-12">
              {/* Standard Instruction */}
              <div className="bg-white p-8 sm:p-10 md:p-12 rounded-3xl shadow-xl border border-gray-200 hover:border-golden transition-all duration-300">
                <h3 className="text-2xl sm:text-3xl font-bold text-black mb-6">Standard Instruction</h3>
                <p className="text-gray-600 leading-relaxed mb-6 font-light text-sm sm:text-base">
                  One-on-one personalized training at your pace. Perfect for those balancing flight training with work or other commitments.
                </p>
                
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Instructor Rate</p>
                  <p className="text-4xl sm:text-5xl font-bold text-golden mb-4">$65<span className="text-base text-gray-500">/hr</span></p>
                  <p className="text-gray-600 text-sm font-light">Dual instruction rate includes aircraft rental</p>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 font-light text-sm sm:text-base">Flexible scheduling</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 font-light text-sm sm:text-base">Personalized training plan</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 font-light text-sm sm:text-base">All certificate levels</span>
                  </li>
                </ul>

                <button
                  onClick={() => {
                    setSelectedAircraft("Flight Instruction")
                    setIsContactOpen(true)
                  }}
                  className="w-full px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300 transform hover:scale-105"
                >
                  Schedule a Lesson
                </button>
              </div>

              {/* Fast Track Training */}
              <div className="bg-gradient-to-br from-golden/10 to-white p-8 sm:p-10 md:p-12 rounded-3xl shadow-xl border-2 border-golden relative overflow-hidden">
                <div className="absolute -top-4 right-6 bg-golden text-black px-4 py-1 rounded-full text-sm font-bold">
                  Intensive
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-bold text-black mb-6 mt-2">Fast Track Training</h3>
                <p className="text-gray-600 leading-relaxed mb-6 font-light text-sm sm:text-base">
                  Accelerated training program for dedicated students. Complete your certification faster with intensive, daily instruction.
                </p>
                
                <div className="mb-8 pb-8 border-b border-golden/20">
                  <p className="text-sm text-gray-600 mb-2">Instructor Rate</p>
                  <p className="text-4xl sm:text-5xl font-bold text-golden mb-4">$75<span className="text-base text-gray-600">/hr</span></p>
                  <p className="text-gray-600 text-sm font-light">Intensive program with priority scheduling</p>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 font-light text-sm sm:text-base">Daily instruction available</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 font-light text-sm sm:text-base">Priority booking</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 font-light text-sm sm:text-base">Faster certification path</span>
                  </li>
                </ul>

                <button
                  onClick={() => {
                    setSelectedAircraft("Fast Track Training")
                    setIsContactOpen(true)
                  }}
                  className="w-full px-6 py-3 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105"
                >
                  Get Fast Track Info
                </button>
              </div>
            </div>

            {/* Training Programs */}
            <div className="mt-12 sm:mt-16">
              <h3 className="text-2xl sm:text-3xl font-bold text-black mb-8 text-center">Training Program Costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <h4 className="text-lg sm:text-xl font-bold text-black mb-4">Discovery Flight</h4>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Introduction to flying experience
                  </p>
                  <div className="mb-4">
                    <p className="text-3xl font-bold text-golden">$200–$300</p>
                    <p className="text-gray-500 text-sm mt-1">30-45 minute flight</p>
                  </div>
                  <p className="text-gray-600 text-sm font-light">Perfect for first-time flyers</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <h4 className="text-lg sm:text-xl font-bold text-black mb-4">Private Pilot License</h4>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Estimated total program cost
                  </p>
                  <div className="mb-4">
                    <p className="text-3xl font-bold text-golden">$8,000–$12,000</p>
                    <p className="text-gray-500 text-sm mt-1">60-80 flight hours</p>
                  </div>
                  <p className="text-gray-600 text-sm font-light">Based on 60+ hour minimum</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <h4 className="text-lg sm:text-xl font-bold text-black mb-4">Instrument Rating</h4>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Advanced rating program
                  </p>
                  <div className="mb-4">
                    <p className="text-3xl font-bold text-golden">$6,000–$9,000</p>
                    <p className="text-gray-500 text-sm mt-1">40-50 flight hours</p>
                  </div>
                  <p className="text-gray-600 text-sm font-light">Build on pilot skills</p>
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
                    <span className="text-gray-200 font-light text-sm sm:text-base">Aircraft rental during lesson</span>
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
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-4">Credit & Debit Cards</h3>
                <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                  We accept all major credit and debit cards through secure payment processing. Easy and convenient for booking your flights.
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 rounded-2xl border border-gray-200">
                <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-4">Flight Hour Blocks</h3>
                <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                  Purchase 10-hour blocks at a discounted rate. Save money while you train and ensure your aircraft is available.
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
                <h3 className="text-lg sm:text-xl font-bold text-black mb-3 text-golden">Are there any hidden fees?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  No. Our rates are all-inclusive. The price you see includes fuel, maintenance, insurance, and all equipment. With flight hour blocks, you save additional money compared to hourly rates.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold text-black mb-3 text-golden">Do I need a medical certificate?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  For discovery flights and recreational flying, you do not need a medical certificate. For commercial training or pilot certification, an FAA medical certificate is required.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold text-black mb-3 text-golden">Can I cancel or reschedule?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  Yes. We offer flexible rescheduling based on instructor and aircraft availability. Please contact us for our cancellation policy details.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold text-black mb-3 text-golden">How do block hours work?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  Purchase a 10-hour block at a discounted rate and use your hours within the contract period. Block hours provide savings of $5–10 per hour compared to standard hourly rates.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg sm:text-xl font-bold text-black mb-3 text-golden">What about fuel surcharges?</h3>
                <p className="text-gray-700 leading-relaxed font-light text-sm sm:text-base">
                  There are no fuel surcharges. Fuel costs are included in our hourly rates. Our transparent pricing means you know exactly what you'll pay.
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
              Contact us today to schedule your discovery flight or discuss your training goals
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setSelectedAircraft("Flight Inquiry")
                  setIsContactOpen(true)
                }}
                className="inline-block px-10 py-4 bg-golden text-black font-bold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 shadow-2xl"
              >
                Contact Us
              </button>
              <Link
                href="/schedule"
                className="inline-block px-10 py-4 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-all duration-300 border-2 border-white/30 hover:border-golden"
              >
                View Schedule
              </Link>
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
