'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

interface SimulatorImage {
  src: string
  alt: string
}

export default function RedBirdSimulator() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isImageLoading, setIsImageLoading] = useState(true)

  const images: SimulatorImage[] = [
    {
      src: '/flight-simulator-images/flight-sim - 1.png',
      alt: 'Redbird Flight Simulator - Cockpit View',
    },
    {
      src: '/flight-simulator-images/flight-sim - 2.png',
      alt: 'Redbird Flight Simulator - Interior',
    },
    {
      src: '/flight-simulator-images/flight-sim - 3.png',
      alt: 'Redbird Flight Simulator - Interface',
    },
    {
      src: '/flight-simulator-images/flight-sim - 4.png',
      alt: 'Redbird Flight Simulator - Display',
    },
    {
      src: '/flight-simulator-images/flight-sim - 5.png',
      alt: 'Redbird Flight Simulator - Control',
    },
    {
      src: '/flight-simulator-images/flight-sim - 6.png',
      alt: 'Redbird Flight Simulator - Setup',
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
    <section className="bg-gradient-to-b from-darkText via-darkText to-black text-white py-12 sm:py-16 md:py-20 border-t border-golden border-opacity-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Image Carousel */}
          <div className="flex flex-col items-center">
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

          {/* Content */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-1 w-12 bg-gradient-to-r from-golden to-transparent" />
              <span className="text-golden font-semibold text-sm tracking-widest uppercase">Advanced Training</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
              Redbird Flight Simulator
            </h2>

            <p className="text-base sm:text-lg text-gray-300 leading-relaxed mb-6">
              Experience realistic flight training with our state-of-the-art Redbird FMX flight simulator. 
              Perfect for building foundational flying skills, practicing procedures, and logging simulator time 
              toward your pilot certification.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <span className="text-golden text-xl flex-shrink-0">✓</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">Realistic Flight Physics</h4>
                  <p className="text-gray-400 text-sm">Motion-based platform with authentic aircraft dynamics</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-golden text-xl flex-shrink-0">✓</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">Professional Instruction</h4>
                  <p className="text-gray-400 text-sm">Guided sessions with FAA-certified flight instructors</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-golden text-xl flex-shrink-0">✓</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">Approved Flight Time</h4>
                  <p className="text-gray-400 text-sm">FAA-approved AATD credits available for instrument, private, commercial, and ATP training</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-golden text-xl flex-shrink-0">✓</span>
                <div>
                  <h4 className="font-semibold text-white mb-1">Flexible Scheduling</h4>
                  <p className="text-gray-400 text-sm">Book sessions at times that work best for you</p>
                </div>
              </div>
            </div>

            <div className="bg-golden/10 border border-golden border-opacity-30 rounded-lg p-6 mb-8">
              <div className="text-2xl sm:text-3xl font-bold text-golden mb-2">
                $75/Hour
              </div>
              <p className="text-gray-300 text-sm">
                Professional training in an FAA-approved flight simulator
              </p>
            </div>

            <div className="bg-white/5 border border-white/15 rounded-lg p-5 mb-8">
              <h3 className="text-white font-semibold mb-3">FAA AATD Credit Snapshot (Redbird FMX)</h3>
              <ul className="space-y-1.5 text-sm text-gray-300">
                <li>Instrument rating: up to 20 hours (14 CFR 61.65(i))</li>
                <li>Private pilot aeronautical experience: up to 2.5 hours (14 CFR 61.109(k)(1))</li>
                <li>Commercial pilot certificate: up to 50 hours (14 CFR 61.129(i)(1)(i))</li>
                <li>ATP certificate: up to 25 hours (14 CFR 61.159(a)(4)(i))</li>
              </ul>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                Per FAA LOA dated October 21, 2021 for Redbird LD/SD/FMX/MCX AATD; letter states expiration October 31, 2026.
                Certain requirements (for example, solo, night, cross-country, and practical test elements) must still be completed in aircraft.
              </p>
              <Link
                href="/simulator/aatd-credit-details"
                className="inline-block mt-4 text-golden hover:text-white transition-colors text-sm font-semibold"
              >
                View Full FAA Credit Details {'->'}
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link 
                href="/schedule" 
                className="inline-block bg-golden hover:bg-golden/90 text-black font-bold py-3 px-6 rounded-lg transition-colors text-center w-full sm:w-auto"
              >
                Book a Flight Session
              </Link>
              <Link
                href="/simulator/aatd-credit-details"
                className="inline-block border border-golden text-golden hover:bg-golden hover:text-black font-semibold py-3 px-6 rounded-lg transition-colors text-center w-full sm:w-auto"
              >
                Aircraft Documents
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
