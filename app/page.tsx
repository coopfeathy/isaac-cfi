'use client'

import React from "react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center bg-black overflow-hidden">
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
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60" />
        
        <div className="relative z-10 text-center text-white px-4 sm:px-6 max-w-6xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-6 sm:mb-8 tracking-tight">
            <div className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent leading-none mb-2">Experience</div>
            <div className="text-white leading-none mb-2">Flight Training</div>
            <Link 
              href="/discovery-flight"
              className="inline-block bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 transition-all duration-300 cursor-pointer"
            >
              Now
            </Link>
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-16 sm:mb-20 md:mb-24 text-gray-300 max-w-3xl mx-auto font-light leading-relaxed px-4">
            Breathtaking flight memories and professional flight training with FAA-certified instructors
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center px-4">
            <Link
              href="/schedule"
              className="w-full sm:w-auto group px-8 sm:px-10 py-3 sm:py-4 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-golden/50 text-base sm:text-lg relative overflow-hidden text-center"
            >
              <span className="relative z-10">Book Your Flight</span>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-golden opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              href="/faq"
              className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-transparent text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300 border-2 border-white/30 hover:border-golden text-base sm:text-lg backdrop-blur-sm text-center"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-white relative">
        {/* Subtle Top Border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-golden to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 sm:mb-5 tracking-tight px-4">
              We are Flight Training
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto font-light px-4 leading-relaxed">
              Merlin Flight Training is a newly founded independent instruction school specialized in training pilots. The unique aspect of our instruction is that we train inside of our aircraft or your aircraft, making our instruction available to aircraft owners and those who prefer to rent.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Fixed Hourly Cost */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300 hover:shadow-2xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 bg-black rounded-xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-golden transition-all duration-300">
                <svg className="w-7 sm:w-8 h-7 sm:h-8 text-golden group-hover:text-black transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4 group-hover:text-golden transition-colors duration-300">
                Fixed Hourly Cost
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                Based on realistic flight times that exceed FAA Part 61 minimums, providing an expected cost of training with no surprises.
              </p>
            </div>

            {/* Flexible Payment */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300 hover:shadow-2xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 bg-black rounded-xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-golden transition-all duration-300">
                <svg className="w-7 sm:w-8 h-7 sm:h-8 text-golden group-hover:text-black transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4 group-hover:text-golden transition-colors duration-300">
                Flexible Payment
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                Accepts credit or debit offering multiple ways to pay for flight training at Merlin Flight Training.
              </p>
            </div>

            {/* Your Schedule */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300 hover:shadow-2xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 bg-black rounded-xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-golden transition-all duration-300">
                <svg className="w-7 sm:w-8 h-7 sm:h-8 text-golden group-hover:text-black transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4 group-hover:text-golden transition-colors duration-300">
                Fast Track or Flexible
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                Fast Track Training or Normal Training enables you to meet time frame requirements or continue training around a job or obligation.
              </p>
            </div>
          </div>

          {/* Location Info */}
          <div className="mt-12 sm:mt-16 text-center">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-4 sm:mb-6 tracking-tight">
              Our Locations
            </h3>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto font-light mb-8 leading-relaxed">
              We operate from three convenient locations across New Jersey and New York
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Location 1: Lumberton, NJ */}
              <a href="/aircraft#n888ms" className="block relative p-6 sm:p-8 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300 hover:shadow-lg overflow-hidden group h-80">
                {/* Aerial Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                  style={{
                    backgroundImage: 'url("/images/flying-w-airport.png")'
                  }}
                />
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-300" />
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-end h-full">
                  <div className="w-12 h-12 bg-golden/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Lumberton, NJ</h4>
                  <p className="text-golden font-semibold mb-3">N888MS Sport Cruiser</p>
                  <p className="text-gray-200 font-medium mb-1 text-sm">N14 - Flying W Airport</p>
                  <p className="text-gray-300 text-xs mb-4">68 Stacy Haines Rd, Lumberton, NJ</p>
                  <div className="flex gap-2">
                    <a
                      href="https://maps.google.com/?q=Flying+W+Airport+Lumberton+NJ"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-center px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300"
                    >
                      View on Map
                    </a>
                  </div>
                </div>
              </a>

              {/* Location 2: Long Island, NY */}
              <a href="/aircraft#n2152z" className="block relative p-6 sm:p-8 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300 hover:shadow-lg overflow-hidden group h-80">
                {/* Aerial Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                  style={{
                    backgroundImage: 'url("/images/republic-airport.png")'
                  }}
                />
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-300" />
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-end h-full">
                  <div className="w-12 h-12 bg-golden/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Long Island, NY</h4>
                  <p className="text-golden font-semibold mb-3">N2152Z Piper Warrior</p>
                  <p className="text-gray-200 font-medium mb-1 text-sm">FRG - Republic Airport</p>
                  <p className="text-gray-300 text-xs mb-4">Farmingdale, New York</p>
                  <div className="flex gap-2">
                    <a
                      href="https://maps.google.com/?q=Republic+Airport+Farmingdale+NY"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-center px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300"
                    >
                      View on Map
                    </a>
                  </div>
                </div>
              </a>

              {/* Location 3: Warwick, NY */}
              <a href="/aircraft#n1624q" className="block relative p-6 sm:p-8 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300 hover:shadow-lg overflow-hidden group h-80">
                {/* Aerial Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                  style={{
                    backgroundImage: 'url("/images/warwick-airport.png")'
                  }}
                />
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-end h-full">
                  <div className="w-12 h-12 bg-golden/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Warwick, NY</h4>
                  <p className="text-golden font-semibold mb-3">N1624Q Cessna 150</p>
                  <p className="text-gray-200 font-medium mb-1 text-sm">N72 - Warwick Municipal</p>
                  <p className="text-gray-300 text-xs mb-4">Warwick, New York</p>
                  <div className="flex gap-2">
                    <a
                      href="https://maps.google.com/?q=Warwick+Municipal+Airport+NY"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-center px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300"
                    >
                      View on Map
                    </a>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome / About Isaac Section */
      <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-gray-50 to-white relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-6 tracking-tight">
              WELCOME!
            </h2>
          </div>

          <div className="bg-white p-8 sm:p-10 md:p-12 rounded-3xl shadow-xl border border-gray-200">
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-2xl sm:text-3xl font-bold text-black mb-2">Isaac Prestwich</h3>
              <p className="text-golden font-semibold text-lg sm:text-xl mb-1">Merlin Flight Training Owner</p>
              <p className="text-gray-600 font-medium">Certified Flight Instructor</p>
              <p className="text-gray-500 text-sm sm:text-base">Idaho, New York, New Jersey Based</p>
            </div>

            <div className="space-y-6 text-gray-700 leading-relaxed font-light">
              <p className="text-base sm:text-lg">
                My name is Isaac Prestwich and I'm the creator of Merlin Flight Training. Instructing new pilots is a passion of mine—I love to see them start and develop into fully grown pilots.
              </p>
              <p className="text-base sm:text-lg">
                My teaching method has been proven to generate results. Whether you're a seasoned pilot or just interested in learning to fly, I will be able to challenge you to become a better pilot.
              </p>
              <p className="text-base sm:text-lg">
                Your search for the next flight instructor ends here. View my services page to see all that I offer, and if you would like to see something new or have a question, feel free to contact me.
              </p>
              <p className="text-base sm:text-lg font-medium text-black">
                Don't wait to start working towards your goals. The best day to start is today.
              </p>
            </div>
          </div>
        </div>
      </section>
}
      {/* What Makes a Safe Pilot Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-black text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
          }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              What Makes a <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Safe Pilot</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-4xl mx-auto font-light leading-relaxed">
              Throughout my years of flying, I have learned many aspects of what determines a safe pilot. When I first started my training in October of 2022, my instructor at the time—who now flies for the airlines—taught me the fundamentals of what it means to be a safe pilot.
            </p>
          </div>

          <div className="mb-12 text-gray-300 leading-relaxed font-light text-base sm:text-lg max-w-4xl mx-auto">
            <p className="mb-6">
              Those early lessons laid the foundation for how I approach aviation today. As I continue to learn and grow in experience, I've come to realize that safety isn't just determined by the rules, but instead it is defined by mindset, discipline, and ability to manage risk. Through my own experiences and shared wisdom of other fellow aviators, I have identified a few key traits of what makes a safe pilot.
            </p>
            <p>
              These principles have guided me throughout my training and career as a pro-pilot, and I will continue to rely on these concepts every time I step into the cockpit.
            </p>
          </div>

          {/* Safety Principles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12">
            {/* Weather Briefer */}
            <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border border-golden/20 hover:border-golden/50 transition-all duration-300">
              <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Weather Briefer</h3>
              <p className="text-gray-300 font-light text-sm sm:text-base leading-relaxed mb-4">
                Not all pilots are meteorologists. A weather briefer is a professional who gives a synopsis on forecast weather conditions. Safe pilots understand they are most likely not professional meteorologists, so they will call ahead of their flight and get a weather briefing.
              </p>
              <p className="text-gray-400 text-sm font-light mb-3">
                It's free and takes 10-15 minutes! This helps determine whether it is safe to fly, weather permitting.
              </p>
              <div className="bg-golden/10 p-4 rounded-lg">
                <p className="text-golden font-semibold text-sm">📞 Dial 1-800-WXBRIEF</p>
                <p className="text-gray-300 text-xs mt-1">Enter your state code to connect with a professional</p>
              </div>
            </div>

            {/* IMSAFE */}
            <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border border-golden/20 hover:border-golden/50 transition-all duration-300">
              <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Pilots Are Human Beings Too</h3>
              <p className="text-gray-300 font-light text-sm sm:text-base leading-relaxed mb-4">
                Have you ever tried to do something strenuous while sick? It can be difficult—simple tasks become burdensome. Now imagine being in an aircraft trying to do a plethora of tasks while sick. That's why pilots use the IMSAFE acronym before flights:
              </p>
              <div className="bg-golden/10 p-4 rounded-lg space-y-1 text-sm">
                <p className="text-white"><span className="text-golden font-bold">I</span>llness</p>
                <p className="text-white"><span className="text-golden font-bold">M</span>edications</p>
                <p className="text-white"><span className="text-golden font-bold">S</span>tress</p>
                <p className="text-white"><span className="text-golden font-bold">A</span>lcohol</p>
                <p className="text-white"><span className="text-golden font-bold">F</span>atigue</p>
                <p className="text-white"><span className="text-golden font-bold">E</span>motion (and Eating!)</p>
              </div>
              <p className="text-gray-400 text-sm font-light mt-4">
                Paying attention to our body will pay back in the future, especially when flying.
              </p>
            </div>

            {/* Regulations */}
            <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border border-golden/20 hover:border-golden/50 transition-all duration-300">
              <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Know the Regulations</h3>
              <p className="text-gray-300 font-light text-sm sm:text-base leading-relaxed mb-4">
                The FAR/AIM (Federal Aviation Regulations and Aeronautical Information Manual) is lengthy—over 1200+ pages. Great pilots sit down, memorize the regulations, and then apply them to their everyday flying.
              </p>
              <p className="text-gray-400 text-sm font-light mb-3">
                Some great starting points:
              </p>
              <div className="space-y-2 text-sm mb-4">
                <div className="bg-golden/10 p-3 rounded-lg">
                  <p className="text-white font-semibold">14 CFR 91.205</p>
                  <p className="text-golden text-xs">ATOMATOFLAMES</p>
                </div>
                <div className="bg-golden/10 p-3 rounded-lg">
                  <p className="text-white font-semibold">14 CFR 91.103</p>
                  <p className="text-golden text-xs">NWKRAFT</p>
                </div>
                <div className="bg-golden/10 p-3 rounded-lg">
                  <p className="text-white font-semibold">14 CFR 91.3</p>
                  <p className="text-gray-300 text-xs">Pilot in Command Authority</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm font-light italic">
                Remember: All regulations have a reason—they may have possibly been written in blood.
              </p>
            </div>
          </div>

          <div className="text-center max-w-4xl mx-auto">
            <p className="text-gray-300 text-base sm:text-lg font-light leading-relaxed">
              Overall, what makes a safe pilot is the preparation they take before the flight to be as prepared as possible. Besides the actual flying aspect, that's one way I have found that works for others in making a safe choice. I hope you all enjoyed this read and were able to get something from it.
            </p>
            <p className="text-golden text-xl font-semibold mt-6">
              As always, Fly Safe!
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Merlin Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-white relative">
        {/* Subtle Top Border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-golden to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 sm:mb-5 tracking-tight px-4">
              Why Choose Merlin
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-light px-4">
              Professional instruction, modern aircraft, and unforgettable experiences
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Safety First */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300 hover:shadow-2xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 bg-black rounded-xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-golden transition-all duration-300">
                <svg className="w-7 sm:w-8 h-7 sm:h-8 text-golden group-hover:text-black transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4 group-hover:text-golden transition-colors duration-300">
                Safety First
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                Meticulously maintained aircraft and strict safety protocols ensure every flight meets the highest standards.
              </p>
            </div>

            {/* Experienced Instructors */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300 hover:shadow-2xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 bg-black rounded-xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-golden transition-all duration-300">
                <svg className="w-7 sm:w-8 h-7 sm:h-8 text-golden group-hover:text-black transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4 group-hover:text-golden transition-colors duration-300">
                Expert Instructors
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                Learn from FAA-certified flight instructors with thousands of hours of experience and a passion for teaching.
              </p>
            </div>

            {/* NYC Views */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-8 sm:p-10 rounded-2xl border border-gray-200 hover:border-golden transition-all duration-300 hover:shadow-2xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 bg-black rounded-xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-golden transition-all duration-300">
                <svg className="w-7 sm:w-8 h-7 sm:h-8 text-golden group-hover:text-black transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4 group-hover:text-golden transition-colors duration-300">
                Stunning Views
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-sm sm:text-base">
                Witness the Statue of Liberty, Manhattan skyline, and iconic landmarks from a unique aerial perspective.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-gray-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-block mb-4">
                <div className="w-10 sm:w-12 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 sm:mb-6 tracking-tight">
                Flight Training Programs
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed font-light">
                Whether you're pursuing your private pilot license or looking for an introductory discovery flight, our comprehensive training programs are designed to help you achieve your aviation goals.
              </p>
              <ul className="space-y-4 sm:space-y-5 mb-8 sm:mb-10">
                <li className="flex items-start group">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-golden flex items-center justify-center mr-3 sm:mr-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-light text-sm sm:text-base">Introductory Discovery Flights</span>
                </li>
                <li className="flex items-start group">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-golden flex items-center justify-center mr-3 sm:mr-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-light text-sm sm:text-base">Private Pilot License Training</span>
                </li>
                <li className="flex items-start group">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-golden flex items-center justify-center mr-3 sm:mr-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-light text-sm sm:text-base">Instrument Rating Courses</span>
                </li>
              </ul>
              <Link
                href="/schedule"
                className="inline-block w-full sm:w-auto text-center px-8 sm:px-10 py-3 sm:py-4 bg-black text-white font-semibold rounded-lg hover:bg-golden hover:text-black transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                View Training Options
              </Link>
            </div>
            <div className="order-1 md:order-2 bg-gradient-to-br from-black to-gray-900 p-8 sm:p-10 md:p-12 rounded-3xl shadow-2xl border border-golden/20">
              <div className="inline-block mb-4">
                <div className="w-10 sm:w-12 h-1 bg-golden rounded-full" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-5">NYC Flight Tours</h3>
              <p className="text-gray-300 mb-6 sm:mb-8 leading-relaxed font-light text-sm sm:text-base">
                Experience the thrill of flying over New York City's most iconic landmarks. Our scenic tours offer unparalleled views and unforgettable memories.
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center group">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-golden/10 flex items-center justify-center mr-3 group-hover:bg-golden transition-colors duration-300 flex-shrink-0">
                    <span className="text-golden text-base sm:text-lg group-hover:text-black transition-colors duration-300">✈</span>
                  </div>
                  <span className="text-gray-200 font-light text-sm sm:text-base">45-minute scenic flights</span>
                </div>
                <div className="flex items-center group">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-golden/10 flex items-center justify-center mr-3 group-hover:bg-golden transition-colors duration-300 flex-shrink-0">
                    <span className="text-golden text-base sm:text-lg group-hover:text-black transition-colors duration-300">✈</span>
                  </div>
                  <span className="text-gray-200 font-light text-sm sm:text-base">Professional pilot narration</span>
                </div>
                <div className="flex items-center group">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-golden/10 flex items-center justify-center mr-3 group-hover:bg-golden transition-colors duration-300 flex-shrink-0">
                    <span className="text-golden text-base sm:text-lg group-hover:text-black transition-colors duration-300">✈</span>
                  </div>
                  <span className="text-gray-200 font-light text-sm sm:text-base">Perfect for special occasions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24 md:py-32 bg-black text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
          }} />
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black opacity-80" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="mb-4 sm:mb-6 inline-block">
            <div className="w-16 sm:w-20 h-1 bg-golden mx-auto rounded-full" />
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 tracking-tight px-4">
            Ready to <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Take Flight</span>?
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl mb-10 sm:mb-12 text-gray-300 max-w-3xl mx-auto font-light leading-relaxed px-4">
            Browse available slots and book your next adventure today.
          </p>
          <Link
            href="/schedule"
            className="inline-block w-full sm:w-auto px-10 sm:px-14 py-4 sm:py-5 bg-golden text-black font-bold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-golden/50 text-base sm:text-lg relative overflow-hidden group mx-4"
          >
            <span className="relative z-10">View Schedule</span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-golden opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </div>
      </section>
    </div>
  )
}

