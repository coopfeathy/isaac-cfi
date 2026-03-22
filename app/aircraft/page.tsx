'use client'

import Link from "next/link"
import Image from "next/image"
import ContactModal from "@/app/components/ContactModal"
import RedBirdSimulator from "@/app/components/RedBirdSimulator"
import { useState } from "react"

interface AircraftImage {
  src: string
  alt: string
}

export default function AircraftPage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [selectedAircraft, setSelectedAircraft] = useState<string | undefined>()

  const images: AircraftImage[] = [
    {
      src: '/images/n2152z-1.JPG',
      alt: 'N2152Z Piper Warrior - Exterior',
    },
    {
      src: '/images/n2152z-2.JPG',
      alt: 'N2152Z Piper Warrior - Cockpit',
    },
  ]

  const nextImage = () => {
    setIsImageLoading(true)
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setIsImageLoading(true)
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }
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
            Our <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Aircraft</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
            Choose from our fleet of well-maintained, modern aircraft for your training or rental needs
          </p>
        </div>
      </section>

      {/* Aircraft Fleet */}
      <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-darkText via-darkText to-black border-t border-golden/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div id="n2152z" className="bg-white/5 rounded-3xl shadow-2xl border border-white/15 overflow-hidden scroll-mt-32">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Image Carousel */}
                <div className="flex flex-col items-center p-4 sm:p-6 bg-white/5">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl mb-4">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 transition-opacity duration-300 ${
                        isImageLoading ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-10 w-10 border-2 border-white/30 border-t-golden rounded-full animate-spin" />
                      </div>
                    </div>
                    <Image
                      src={images[currentImageIndex].src}
                      alt={images[currentImageIndex].alt}
                      fill
                      className={`object-cover transition-opacity duration-500 ${
                        isImageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                      priority
                      onLoad={() => setIsImageLoading(false)}
                    />
                  </div>

                  {/* Carousel Controls */}
                  <div className="flex items-center gap-4 w-full justify-center mb-4">
                    <button
                      onClick={prevImage}
                      className="bg-golden hover:bg-golden/80 text-black px-4 py-2 rounded-lg transition-colors font-semibold"
                    >
                      ← Previous
                    </button>
                    <div className="text-sm text-gray-400">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                    <button
                      onClick={nextImage}
                      className="bg-golden hover:bg-golden/80 text-black px-4 py-2 rounded-lg transition-colors font-semibold"
                    >
                      Next →
                    </button>
                  </div>

                  {/* Image Indicators */}
                  <div className="flex gap-2 flex-wrap justify-center">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setIsImageLoading(true)
                          setCurrentImageIndex(index)
                        }}
                        className={`h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? 'bg-golden w-8'
                            : 'bg-gray-600 w-2 hover:bg-gray-500'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-8 sm:p-10 md:p-12">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">N2152Z Piper Warrior</h2>
                      <p className="text-golden font-semibold text-lg sm:text-xl">Long Island, NY</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">From</p>
                      <p className="text-2xl sm:text-3xl font-bold text-golden">$185<span className="text-base text-gray-400">/hr</span></p>
                    </div>
                  </div>
                  
                  <div className="mb-6 pb-6 border-b border-white/15">
                    <a 
                      href="https://maps.apple.com/?q=FRG+Republic+Airport+Farmingdale+NY"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 font-medium mb-2 hover:text-golden transition-colors"
                    >
                      📍 FRG (Republic Airport)
                    </a>
                    <p className="text-gray-400 text-sm">Located in Farmingdale, New York</p>
                  </div>

                  <p className="text-gray-300 leading-relaxed mb-6 font-light">
                    Fly our airplane, equipped with a new array of avionics, glass instruments and new interior.
                  </p>

                  <p className="text-gray-300 leading-relaxed mb-6 font-light">
                    Airplane is great for training all certificates: Private Pilot, Instrument Pilot, and Commercial Pilot.
                  </p>

                  <div className="bg-white/5 border border-white/15 p-6 rounded-2xl mb-6">
                    <h3 className="font-semibold text-white mb-3 text-lg">Features</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300 font-light">Glass Instruments</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300 font-light">New Avionics Array</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-golden mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300 font-light">New Interior</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Link
                      href="/schedule"
                      className="block w-full text-center px-8 py-4 bg-golden text-black font-bold rounded-lg hover:bg-golden/90 transition-all duration-300"
                    >
                      Book a Flight Session
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedAircraft("N2152Z Piper Warrior Documents")
                        setIsContactOpen(true)
                      }}
                      className="block w-full text-center px-8 py-4 border border-golden text-golden hover:bg-golden hover:text-black font-semibold rounded-lg transition-colors duration-300"
                    >
                      Aircraft Documents
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <RedBirdSimulator />

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
            Schedule a lesson or contact us to learn more about our fleet
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/schedule"
              className="inline-block px-10 py-4 font-bold text-lg rounded-lg bg-golden text-darkText hover:bg-golden/90 transition-colors duration-300"
            >
              Book a Flight Session
            </Link>
            <button
              onClick={() => {
                setSelectedAircraft("Aircraft Documents")
                setIsContactOpen(true)
              }}
              className="inline-block px-10 py-4 border border-golden text-golden hover:bg-golden hover:text-black font-semibold rounded-lg transition-colors duration-300"
            >
              Aircraft Documents
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
