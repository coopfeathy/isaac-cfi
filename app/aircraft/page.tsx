'use client'

import Link from "next/link"
import Image from "next/image"
import RedBirdSimulator from "@/app/components/RedBirdSimulator"
import { useState } from "react"

interface AircraftImage {
  src: string
  alt: string
}

export default function AircraftPage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isImageLoading, setIsImageLoading] = useState(true)

  const images: AircraftImage[] = [
    {
      src: '/images/our-aircraft-header.JPG',
      alt: 'N9725U - photos coming soon',
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
        <div id="n9725u" className="container mx-auto px-4 sm:px-6 scroll-mt-32">
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
              <div className="flex items-center gap-3 w-full justify-center mb-4">
                <button
                  onClick={prevImage}
                  className="bg-golden hover:bg-golden/80 text-black px-3 py-2 rounded-lg transition-colors font-semibold text-sm sm:text-base min-w-[44px] min-h-[44px]"
                >
                  <span className="hidden sm:inline">← Previous</span>
                  <span className="sm:hidden">←</span>
                </button>
                <div className="text-sm text-gray-400 tabular-nums">
                  {currentImageIndex + 1} / {images.length}
                </div>
                <button
                  onClick={nextImage}
                  className="bg-golden hover:bg-golden/80 text-black px-3 py-2 rounded-lg transition-colors font-semibold text-sm sm:text-base min-w-[44px] min-h-[44px]"
                >
                  <span className="hidden sm:inline">Next →</span>
                  <span className="sm:hidden">→</span>
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
                <span className="text-golden font-semibold text-sm tracking-widest uppercase">Training Aircraft</span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
                N9725U
              </h2>

              <p className="text-base sm:text-lg text-gray-300 leading-relaxed mb-6">
                Our training aircraft — well-maintained and ready for flight instruction and rental out of Republic Airport. Full aircraft specs and photos coming soon.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-golden text-xl flex-shrink-0">✓</span>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Republic Airport Based</h4>
                    <p className="text-gray-400 text-sm">
                      <a
                        href="https://maps.apple.com/?q=FRG+Republic+Airport+Farmingdale+NY"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-golden transition-colors"
                      >
                        FRG in Farmingdale, New York
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-golden text-xl flex-shrink-0">✓</span>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Multi-Certificate Utility</h4>
                    <p className="text-gray-400 text-sm">Suitable for private, instrument, and commercial pilot training tracks</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-golden text-xl flex-shrink-0">✓</span>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Full Details Coming Soon</h4>
                    <p className="text-gray-400 text-sm">Updated photos and complete aircraft specifications will be posted shortly</p>
                  </div>
                </div>
              </div>

              <div className="bg-golden/10 border border-golden border-opacity-30 rounded-lg p-6 mb-8">
                <div className="text-2xl sm:text-3xl font-bold text-golden mb-2">
                  $185/Hour
                </div>
                <p className="text-gray-300 text-sm">
                  Aircraft rental and training availability from Republic Airport
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  href="/schedule"
                  className="inline-block bg-golden hover:bg-golden/90 text-black font-bold py-3 px-6 rounded-lg transition-colors text-center w-full sm:w-auto"
                >
                  Book a Flight Session
                </Link>
                <Link
                  href="/aircraft/documents"
                  className="inline-block border border-golden text-golden hover:bg-golden hover:text-black font-semibold py-3 px-6 rounded-lg transition-colors text-center w-full sm:w-auto"
                >
                  Aircraft Documents
                </Link>
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
          </div>
        </div>
      </section>
      </div>
    </>
  )
}
