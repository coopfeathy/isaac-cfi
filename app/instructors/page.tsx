'use client'

import Link from "next/link"
import { useState } from "react"
import ContactModal from "@/app/components/ContactModal"
import CalendlyButton from "@/app/components/CalendlyButton"

// Instructor data - easy to update when adding photos or new instructors
const instructors = [
  {
    id: 1,
    name: "Isaac",
    role: "Chief Flight Instructor",
    certifications: ["CFI", "CFII", "MEI"],
    bio: "Isaac is the founder of Merlin Flight Training and brings a passion for aviation and teaching to every lesson. His patient, methodical approach helps students build confidence and skill from day one.",
    specialties: ["Private Pilot", "Instrument Rating", "Commercial Pilot"],
    // TODO: Add photo path when available
    photo: null,
  },
  {
    id: 2,
    name: "Maria",
    role: "Flight Instructor",
    certifications: ["CFI", "CFII"],
    bio: "Maria is dedicated to helping students achieve their aviation goals. Her encouraging teaching style and attention to detail make her an excellent instructor for pilots at every stage of their training.",
    specialties: ["Private Pilot", "Instrument Rating"],
    // TODO: Add photo path when available
    photo: null,
  },
]

export default function InstructorsPage() {
  const [isContactOpen, setIsContactOpen] = useState(false)

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
              Our <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Instructors</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
              Meet the experienced team behind Merlin Flight Training
            </p>
          </div>
        </section>

        {/* Instructors Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16 md:mb-20">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 tracking-tight">
                Meet Your Instructors
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
                Our FAA-certified instructors are dedicated to your success in the sky
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 md:gap-12">
              {instructors.map((instructor) => (
                <div
                  key={instructor.id}
                  className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden hover:border-golden transition-all duration-300"
                >
                  {/* Photo placeholder - easy to swap when photos are added */}
                  <div className="relative h-64 sm:h-72 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    {instructor.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={instructor.photo}
                        alt={instructor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-golden/20 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-sm font-light">Photo coming soon</p>
                      </div>
                    )}
                  </div>

                  {/* Instructor Info */}
                  <div className="p-6 sm:p-8">
                    <div className="mb-4">
                      <h3 className="text-2xl sm:text-3xl font-bold text-black mb-1">{instructor.name}</h3>
                      <p className="text-golden font-semibold text-lg">{instructor.role}</p>
                    </div>

                    {/* Certifications */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {instructor.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="px-3 py-1 bg-black text-white text-sm font-medium rounded-full"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>

                    <p className="text-gray-700 leading-relaxed mb-6 font-light">
                      {instructor.bio}
                    </p>

                    {/* Specialties */}
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-500 mb-2 font-medium">Training Specialties</p>
                      <div className="flex flex-wrap gap-2">
                        {instructor.specialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="px-3 py-1 bg-golden/10 text-golden text-sm font-medium rounded-lg border border-golden/20"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Train With Us Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-block mb-4">
                <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 tracking-tight">
                Why Train With Us
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-golden/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-black mb-3">FAA Certified</h3>
                <p className="text-gray-600 font-light">
                  All of our instructors hold current FAA certifications and maintain the highest standards of professionalism.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-golden/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Personalized Training</h3>
                <p className="text-gray-600 font-light">
                  We tailor our instruction to your learning style, schedule, and aviation goals for the best possible experience.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-golden/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Flexible Scheduling</h3>
                <p className="text-gray-600 font-light">
                  We work around your schedule to make flight training accessible, whether you're a weekend warrior or training full-time.
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
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              Ready to <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Start Training</span>?
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
              Schedule your first lesson or get in touch with any questions
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <CalendlyButton
                className="inline-block px-10 py-4 font-bold text-lg"
                variant="primary"
              >
                Schedule a Lesson
              </CalendlyButton>
              <button
                onClick={() => setIsContactOpen(true)}
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
        aircraftName="Instructor Inquiry"
      />
    </>
  )
}
