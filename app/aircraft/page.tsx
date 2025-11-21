'use client'

import Link from "next/link"
import ImageCarousel from "@/app/components/ImageCarousel"

export default function AircraftPage() {
  return (
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
            Our <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Aircraft</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
            Choose from our fleet of well-maintained, modern aircraft for your training or rental needs
          </p>
        </div>
      </section>

      {/* Aircraft Fleet */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="space-y-16 sm:space-y-20 md:space-y-24">
            
            {/* Aircraft 1: Sport Cruiser */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="h-64 sm:h-80 lg:h-full flex items-center justify-center">
                  <ImageCarousel 
                    images={[
                      '/images/n888ms-1.JPG',
                      '/images/n888ms-2.JPG',
                      '/images/n888ms-3.JPG',
                    ]}
                    objectPositions={[
                      'center center',
                      'center center',
                      'center bottom',
                    ]}
                    alt="N888MS Sport Cruiser"
                  />
                </div>
                <div className="p-8 sm:p-10 md:p-12">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-bold text-black mb-2">N888MS Sport Cruiser</h2>
                      <p className="text-golden font-semibold text-lg sm:text-xl">Lumberton, NJ</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">From</p>
                      <p className="text-2xl sm:text-3xl font-bold text-golden">$147.50<span className="text-base text-gray-500">/hr</span></p>
                    </div>
                  </div>
                  
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <a 
                      href="https://maps.apple.com/?q=Flying+W+Airport+N14+Lumberton+NJ"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 font-medium mb-2 hover:text-golden transition-colors"
                    >
                      📍 N14 (Flying W Airport)
                    </a>
                    <p className="text-gray-500 text-sm">Located in Lumberton, New Jersey</p>
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-6 font-light">
                    Fly our airplane, equipped with a glass-cockpit, to further your aviation ratings/hours/experience. Our aircraft is available for rental with our instructors. This is a perfect airplane for XC experience with a cruise of over 100 knots, it's also great for practicing private pilot maneuvers and commercial pilot maneuvers at a highly competitive rate.
                  </p>

                  <div className="bg-gray-50 p-6 rounded-2xl mb-6">
                    <h3 className="font-semibold text-black mb-4 text-lg">Aircraft Rates</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">1 Hour</span>
                        <span className="font-bold text-black text-lg">$152.50</span>
                      </div>
                      <div className="flex justify-between items-center py-3 px-4 bg-golden/10 rounded-lg border border-golden/20">
                        <span className="text-gray-700 font-medium">10 Hour Block</span>
                        <span className="font-bold text-golden text-xl">$147.50/hr</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="mailto:Isaac.Imp.Prestwich@gmail.com"
                    className="block w-full text-center px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Contact Instructors
                  </Link>
                </div>
              </div>
            </div>

            {/* Aircraft 2: Piper Warrior */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="h-64 sm:h-80 lg:h-full flex items-center justify-center order-2 lg:order-1">
                  <ImageCarousel 
                    images={[
                      '/images/n2152z-1.JPG',
                      '/images/n2152z-2.JPG',
                    ]}
                    objectPositions={[
                      'center center',
                      'center center',
                    ]}
                    alt="N2152Z Piper Warrior"
                  />
                </div>
                <div className="p-8 sm:p-10 md:p-12 order-1 lg:order-2">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-bold text-black mb-2">N2152Z Piper Warrior</h2>
                      <p className="text-golden font-semibold text-lg sm:text-xl">Long Island, NY</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">From</p>
                      <p className="text-2xl sm:text-3xl font-bold text-golden">$185<span className="text-base text-gray-500">/hr</span></p>
                    </div>
                  </div>
                  
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <a 
                      href="https://maps.apple.com/?q=FRG+Republic+Airport+Farmingdale+NY"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 font-medium mb-2 hover:text-golden transition-colors"
                    >
                      📍 FRG (Republic Airport)
                    </a>
                    <p className="text-gray-500 text-sm">Located in Farmingdale, New York</p>
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-6 font-light">
                    Fly our airplane, equipped with a new array of avionics, glass instruments and new interior.
                  </p>

                  <p className="text-gray-700 leading-relaxed mb-6 font-light">
                    Airplane is great for training all certificates: Private Pilot, Instrument Pilot, and Commercial Pilot.
                  </p>

                  <div className="bg-gray-50 p-6 rounded-2xl mb-6">
                    <h3 className="font-semibold text-black mb-3 text-lg">Features</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600 font-light">Glass Instruments</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600 font-light">New Avionics Array</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600 font-light">New Interior</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    href="mailto:Isaac.Imp.Prestwich@gmail.com"
                    className="block w-full text-center px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Contact Instructors
                  </Link>
                </div>
              </div>
            </div>

            {/* Aircraft 3: Cessna 150 */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="h-64 sm:h-80 lg:h-full flex items-center justify-center">
                  <ImageCarousel 
                    images={[
                      '/images/n1624q-1.JPG',
                      '/images/n1624q-2.JPG',
                      '/images/n1624q-3.JPG',
                    ]}
                    objectPositions={[
                      'center center',
                      'center center',
                      'center center',
                    ]}
                    alt="N1624Q Cessna 150"
                  />
                </div>
                <div className="p-8 sm:p-10 md:p-12">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-bold text-black mb-2">N1624Q Cessna 150</h2>
                      <p className="text-golden font-semibold text-lg sm:text-xl">Warwick, NY</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">From</p>
                      <p className="text-2xl sm:text-3xl font-bold text-golden">$150<span className="text-base text-gray-500">/hr</span></p>
                    </div>
                  </div>
                  
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <a 
                      href="https://maps.apple.com/?q=N72+Warwick+Municipal+Airport+Warwick+NY"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 font-medium mb-2 hover:text-golden transition-colors"
                    >
                      📍 N72 (Warwick Municipal Airport)
                    </a>
                    <p className="text-gray-500 text-sm">Located in Warwick, New York</p>
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-6 font-light">
                    Fly our airplane, equipped with a 6-pack steam gauge, to further your aviation ratings/hours/experience. Our aircraft is available for rental with our instructors. This is a perfect airplane for practicing private pilot maneuvers and commercial pilot maneuvers at a highly competitive rate.
                  </p>

                  <div className="bg-gradient-to-br from-black to-gray-900 p-6 rounded-2xl mb-6 text-white">
                    <h3 className="font-semibold text-golden mb-3 text-lg">Perfect For</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <span className="text-golden mr-2">✈</span>
                        <span className="font-light">Private Pilot Training</span>
                      </li>
                      <li className="flex items-center">
                        <span className="text-golden mr-2">✈</span>
                        <span className="font-light">Commercial Pilot Maneuvers</span>
                      </li>
                      <li className="flex items-center">
                        <span className="text-golden mr-2">✈</span>
                        <span className="font-light">Cross-Country Experience</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    href="mailto:Isaac.Imp.Prestwich@gmail.com"
                    className="block w-full text-center px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Contact Instructors
                  </Link>
                </div>
              </div>
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
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Ready to <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Get Started</span>?
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
            Contact us today to schedule your training or rental
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="mailto:Isaac.Imp.Prestwich@gmail.com"
              className="inline-block px-10 py-4 bg-golden text-black font-bold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              Email Us
            </Link>
            <Link
              href="tel:+12083012629"
              className="inline-block px-10 py-4 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-all duration-300 border-2 border-white/30 hover:border-golden"
            >
              Call Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
