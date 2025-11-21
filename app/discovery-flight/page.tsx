'use client'

import Link from "next/link"

export default function DiscoveryFlight() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center bg-black overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/flightTakeoff.mov" type="video/quicktime" />
          <source src="/flightTakeoff.mov" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70" />
        
        <div className="relative z-10 text-center text-white px-4 sm:px-6 max-w-5xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Discovery Flight</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto font-light leading-relaxed">
            Take the controls and experience the thrill of flying with a professional instructor
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
              Your First Step to Becoming a Pilot
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
              A discovery flight is an introductory lesson where you'll get hands-on experience flying an aircraft with a certified flight instructor. It's the perfect way to see if flight training is right for you.
            </p>
          </div>

          {/* What to Expect */}
          <div className="bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 md:p-12 rounded-3xl shadow-xl border border-gray-200 mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-black mb-6">What to Expect</h3>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-golden flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <span className="text-black font-bold text-lg">1</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-black mb-2">Pre-Flight Briefing</h4>
                  <p className="text-gray-600 font-light leading-relaxed">
                    Meet your instructor and learn about the aircraft, flight controls, and what you'll experience during your flight.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-golden flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <span className="text-black font-bold text-lg">2</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-black mb-2">Aircraft Walkaround</h4>
                  <p className="text-gray-600 font-light leading-relaxed">
                    Perform a pre-flight inspection with your instructor to ensure the aircraft is safe and ready for flight.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-golden flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <span className="text-black font-bold text-lg">3</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-black mb-2">Take the Controls</h4>
                  <p className="text-gray-600 font-light leading-relaxed">
                    Experience the thrill of controlling the aircraft during your flight. Your instructor will guide you through basic maneuvers and let you feel what it's like to be a pilot.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-golden flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <span className="text-black font-bold text-lg">4</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-black mb-2">Post-Flight Debrief</h4>
                  <p className="text-gray-600 font-light leading-relaxed">
                    Discuss your experience, ask questions, and learn about the next steps in your flight training journey.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Flight Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12">
            <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Duration</h3>
              <p className="text-gray-600 font-light">Approximately 60 minutes of flight time, plus ground briefing</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Who Can Fly</h3>
              <p className="text-gray-600 font-light">No experience required! Anyone 16+ can take a discovery flight</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black mb-3">What's Included</h3>
              <p className="text-gray-600 font-light">Aircraft rental, instructor time, and a logbook to record your flight</p>
            </div>
          </div>

          {/* What to Bring */}
          <div className="bg-black text-white p-8 sm:p-10 md:p-12 rounded-3xl shadow-2xl mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6">What to Bring</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-golden rounded-full mr-3"></div>
                <span className="text-gray-200 font-light">Valid photo ID</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-golden rounded-full mr-3"></div>
                <span className="text-gray-200 font-light">Comfortable clothing</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-golden rounded-full mr-3"></div>
                <span className="text-gray-200 font-light">Sunglasses (recommended)</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-golden rounded-full mr-3"></div>
                <span className="text-gray-200 font-light">Water bottle</span>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-br from-gray-50 to-white p-12 sm:p-16 rounded-3xl border border-gray-200">
            <h3 className="text-3xl sm:text-4xl font-bold text-black mb-4">Ready to Take Flight?</h3>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto font-light">
              Book your discovery flight today and experience the freedom of flight
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/schedule"
                className="w-full sm:w-auto group px-10 py-4 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-golden/50 text-lg relative overflow-hidden text-center"
              >
                <span className="relative z-10">Book Your Discovery Flight</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-golden opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link
                href="/faq"
                className="w-full sm:w-auto px-10 py-4 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-300 text-lg text-center"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
