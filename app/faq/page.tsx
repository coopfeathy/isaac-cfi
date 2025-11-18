"use client"

import { useState } from "react"

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: "How long does it take to become a pilot?",
      answer: "The timeline varies depending on your schedule and commitment. On average, students training 2-3 times per week can complete their Private Pilot Certificate in 6-12 months. We offer both Fast Track Training for accelerated timelines and Normal Training that works around your job or other obligations."
    },
    {
      question: "How to get started?",
      answer: "Getting started is easy! First, schedule a discovery flight to experience flying firsthand and meet our instructors. Then, apply for your FAA Medical Certificate through an Aviation Medical Examiner (AME). We'll help you apply for your Student Pilot Certificate through IACRA and create a personalized training plan. Contact us at Isaac.Imp.Prestwich@gmail.com or call +1 (208) 301-2629 to begin your journey."
    },
    {
      question: "How much does flight training cost?",
      answer: "We offer fixed hourly costs based on realistic flight times that exceed FAA Part 61 minimums, providing transparent pricing with no surprises. Our aircraft rental rates start at $147.50/hr (10-hour block) for the Sport Cruiser, $150/hr for the Cessna 150, and $185/hr for the Piper Warrior. We accept credit and debit cards for flexible payment options. Contact us for a detailed cost breakdown for your specific training goals."
    },
    {
      question: "Is my money safe with you?",
      answer: "Absolutely. We operate with full transparency and provide clear invoicing for all training sessions. Our fixed hourly rates mean you know exactly what you're paying for, and we accept multiple payment methods including credit and debit cards. All transactions are documented and receipted."
    },
    {
      question: "Is there a way to get flight training for cheaper?",
      answer: "Yes! We offer 10-hour block rates that provide significant savings compared to our standard hourly rates. For example, our Sport Cruiser is $152.50/hr for single hours or $147.50/hr when you purchase a 10-hour block. This is one of the most competitive rates in the region for glass-cockpit aircraft. We also train in your aircraft if you're an aircraft owner, which can reduce costs."
    },
    {
      question: "What happens if I need to cancel due to weather?",
      answer: "Weather cancellations are a normal part of flight training and there is no penalty for weather-related cancellations. Safety is our top priority - we always get a weather briefing before each flight (call 1-800-WXBRIEF) and if conditions aren't safe, we'll reschedule at no charge. We can use weather delays as opportunities for ground instruction to keep your training progressing."
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 sm:py-24 md:py-32 bg-black overflow-hidden">
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
            Frequently Asked <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Questions</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
            Have Questions about Flight Training?
          </p>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 overflow-hidden hover:border-golden/50 transition-all duration-300"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full text-left p-6 sm:p-8 flex justify-between items-start gap-4"
                >
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-black pr-4">
                    {faq.question}
                  </h3>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-golden/10 flex items-center justify-center transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-golden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {openIndex === index && (
                  <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-gray-700 leading-relaxed font-light text-base sm:text-lg">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps to Become a Pilot */}
      <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-gray-50 to-white relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-6 tracking-tight">
              Steps to Become a <span className="text-golden">Pilot</span>
            </h2>
          </div>

          <div className="space-y-8 sm:space-y-10">
            {/* Step 1 */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl border border-gray-200 hover:border-golden/50 transition-all duration-300">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-golden rounded-xl flex items-center justify-center">
                  <span className="text-black font-bold text-xl sm:text-2xl">1</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-3 sm:mb-4">Research Flight Schools</h3>
                  <p className="text-gray-700 leading-relaxed font-light text-base sm:text-lg">
                    Each school has its own benefits and disadvantages. Choosing the right flight school is crucial in flight training.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl border border-gray-200 hover:border-golden/50 transition-all duration-300">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-golden rounded-xl flex items-center justify-center">
                  <span className="text-black font-bold text-xl sm:text-2xl">2</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-3 sm:mb-4">Take an Admission Flight</h3>
                  <p className="text-gray-700 leading-relaxed font-light text-base sm:text-lg">
                    Sometimes called a discovery flight, is an introductory flight in an aircraft. This is a great time to explore the school, their aircraft, equipment, instructors, and is a great way to understand what it feels like behind the controls.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl border border-gray-200 hover:border-golden/50 transition-all duration-300">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-golden rounded-xl flex items-center justify-center">
                  <span className="text-black font-bold text-xl sm:text-2xl">3</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-3 sm:mb-4">Apply for a FAA Medical Certificate</h3>
                  <p className="text-gray-700 leading-relaxed font-light text-base sm:text-lg">
                    Pilots must meet basic fitness requirements in order to Solo (take the aircraft up yourself). It is advised that all pilots apply for a first class medical if they are wanting to become a professional pilot. This is done through an AME (Aviation Medical Examiner).
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl border border-gray-200 hover:border-golden/50 transition-all duration-300">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-golden rounded-xl flex items-center justify-center">
                  <span className="text-black font-bold text-xl sm:text-2xl">4</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-3 sm:mb-4">Apply for a Student Pilot Certificate</h3>
                  <p className="text-gray-700 leading-relaxed font-light text-base sm:text-lg">
                    This can be completed through the FAA's Integrated Airmen Certification and Rating Application (IACRA). Your flight instructor will help you with this. This certificate is required for the student's solo flight.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl border border-gray-200 hover:border-golden/50 transition-all duration-300">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-golden rounded-xl flex items-center justify-center">
                  <span className="text-black font-bold text-xl sm:text-2xl">5</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-3 sm:mb-4">Start Flight Training Lessons</h3>
                  <p className="text-gray-700 leading-relaxed font-light text-base sm:text-lg">
                    Begin working towards the aeronautical knowledge and pilot training experience requirements for a Private Pilot Certificate. The student will accumulate hours of flight time during this process and begin ground school for aeronautical knowledge requirements.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl border border-gray-200 hover:border-golden/50 transition-all duration-300">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-golden rounded-xl flex items-center justify-center">
                  <span className="text-black font-bold text-xl sm:text-2xl">6</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-3 sm:mb-4">Pass Private Pilot Knowledge Test</h3>
                  <p className="text-gray-700 leading-relaxed font-light text-base sm:text-lg">
                    In order to be eligible for the test, you will need to be endorsed by an instructor. This requires ground school in order to be endorsement eligible.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 7 */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl border border-gray-200 hover:border-golden/50 transition-all duration-300">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-golden rounded-xl flex items-center justify-center">
                  <span className="text-black font-bold text-xl sm:text-2xl">7</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-3 sm:mb-4">Pass the Private Pilot Practical Exam</h3>
                  <p className="text-gray-700 leading-relaxed font-light text-base sm:text-lg mb-4">
                    This is taken with a Designated Pilot Examiner (DPE) and is the final portion of the private pilot training before you receive your license.
                  </p>
                  <p className="text-gray-700 leading-relaxed font-light text-base sm:text-lg">
                    The test consists of a ground portion and a flight portion.
                  </p>
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
            Still Have <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Questions</span>?
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
            We're here to help! Contact us and we'll answer any questions you have about flight training.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:Isaac.Imp.Prestwich@gmail.com"
              className="inline-block px-10 py-4 bg-golden text-black font-bold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              Email Us
            </a>
            <a
              href="tel:+12083012629"
              className="inline-block px-10 py-4 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-all duration-300 border-2 border-white/30 hover:border-golden"
            >
              Call Now
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

