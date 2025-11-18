'use client'

import Link from "next/link"
import { useAuth } from "./contexts/AuthContext"

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        <div className="relative z-10 text-center text-white px-6 max-w-5xl mx-auto">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight">
            Soar Above<br />
            <span className="text-golden">New York City</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-300 max-w-3xl mx-auto">
            Experience breathtaking flight tours and professional flight training with certified instructors
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/schedule"
              className="px-10 py-4 bg-golden text-darkText font-bold rounded-xl hover:bg-yellow-500 transition-all transform hover:scale-105 shadow-xl text-lg"
            >
              Book a Flight
            </Link>
            <Link
              href="/faq"
              className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/20 transition-all border-2 border-white/30 text-lg"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-darkText mb-4">
              Why Choose Merlin Flight Training
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional instruction, modern aircraft, and unforgettable experiences
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Safety First */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-darkText mb-3">
                Safety First
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Meticulously maintained aircraft and strict safety protocols ensure every flight meets the highest standards.
              </p>
            </div>

            {/* Experienced Instructors */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-golden to-yellow-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-darkText mb-3">
                Expert Instructors
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Learn from certified flight instructors with thousands of hours of experience and a passion for teaching.
              </p>
            </div>

            {/* NYC Views */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-darkText mb-3">
                Stunning Views
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Witness the Statue of Liberty, Manhattan skyline, and iconic landmarks from a unique aerial perspective.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-darkText mb-6">
                Flight Training Programs
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Whether you're pursuing your private pilot license or looking for an introductory discovery flight, our comprehensive training programs are designed to help you achieve your aviation goals.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-golden mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Introductory Discovery Flights</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-golden mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Private Pilot License Training</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-golden mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Instrument Rating Courses</span>
                </li>
              </ul>
              <Link
                href="/schedule"
                className="inline-block px-8 py-3 bg-darkText text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
              >
                View Training Options
              </Link>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-12 rounded-3xl">
              <h3 className="text-3xl font-bold text-darkText mb-4">NYC Flight Tours</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Experience the thrill of flying over New York City's most iconic landmarks. Our scenic tours offer unparalleled views and unforgettable memories.
              </p>
              <div className="space-y-3 text-gray-700">
                <p className="flex items-center">
                  <span className="text-golden mr-2">✈</span>
                  45-minute scenic flights
                </p>
                <p className="flex items-center">
                  <span className="text-golden mr-2">✈</span>
                  Professional pilot narration
                </p>
                <p className="flex items-center">
                  <span className="text-golden mr-2">✈</span>
                  Perfect for special occasions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Ready to Take Flight?
          </h2>
          <p className="text-xl mb-10 text-gray-300">
            {user 
              ? "Browse available slots and book your next adventure today."
              : "Sign in to view available slots and start your aviation journey."
            }
          </p>
          <Link
            href={user ? "/schedule" : "/login"}
            className="inline-block px-12 py-5 bg-golden text-darkText font-bold rounded-xl hover:bg-yellow-500 transition-all transform hover:scale-105 shadow-2xl text-lg"
          >
            {user ? "View Schedule" : "Get Started"}
          </Link>
        </div>
      </section>
    </div>
  )
}

