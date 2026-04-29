'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Program = {
  name: string
  summary: string
  certificateCost: string
  requiredHours: number | null
  typicalHours: number | null
  instructionHours: number | null
  cardEstimate: number | null
  cashEstimate: number | null
}

const FLIGHT_INSTRUCTION_RATE = 65
const AIRCRAFT_CARD_RATE = 195
const AIRCRAFT_CASH_RATE = 185
const AIRCRAFT_RENTAL_RATE_LABEL = `$${AIRCRAFT_CARD_RATE}/hr card | $${AIRCRAFT_CASH_RATE}/hr cash`

const equipmentBundle = {
  headset: 1099,
  ipad: 499,
  foreflight: 240,
  privatePilotCheckride: 1000,
  writtenExam: 175,
}

const equipmentBundleTotal =
  equipmentBundle.headset +
  equipmentBundle.ipad +
  equipmentBundle.foreflight +
  equipmentBundle.privatePilotCheckride +
  equipmentBundle.writtenExam

const programs: Program[] = [
  {
    name: 'Private Pilot',
    summary: 'Core certificate track from first lesson through checkride prep.',
    certificateCost: 'Flight training + instruction + startup bundle',
    requiredHours: 40,
    typicalHours: 60,
    instructionHours: 84,
    cardEstimate: (60 * AIRCRAFT_CARD_RATE) + (84 * FLIGHT_INSTRUCTION_RATE) + equipmentBundleTotal,
    cashEstimate: (60 * AIRCRAFT_CASH_RATE) + (84 * FLIGHT_INSTRUCTION_RATE) + equipmentBundleTotal,
  },
  {
    name: 'Instrument',
    summary: 'Weather, procedures, and precision flying beyond visual conditions.',
    certificateCost: 'Training estimate plus exam costs',
    requiredHours: 40,
    typicalHours: 50,
    instructionHours: 70,
    cardEstimate: (50 * AIRCRAFT_CARD_RATE) + (70 * FLIGHT_INSTRUCTION_RATE) + 1000 + 175,
    cashEstimate: (50 * AIRCRAFT_CASH_RATE) + (70 * FLIGHT_INSTRUCTION_RATE) + 1000 + 175,
  },
  {
    name: 'Commercial',
    summary: 'Professional-level maneuvers and standards for paid flying work.',
    certificateCost: 'Training estimate plus exam costs',
    requiredHours: 120,
    typicalHours: 120,
    instructionHours: 168,
    cardEstimate: (120 * AIRCRAFT_CARD_RATE) + (168 * FLIGHT_INSTRUCTION_RATE) + 1000 + 175,
    cashEstimate: (120 * AIRCRAFT_CASH_RATE) + (168 * FLIGHT_INSTRUCTION_RATE) + 1000 + 175,
  },
  {
    name: 'Additional Training',
    summary: 'Checkride polish, refresher flights, endorsements, and proficiency work.',
    certificateCost: 'Hourly pay-as-you-train',
    requiredHours: null,
    typicalHours: null,
    instructionHours: null,
    cardEstimate: null,
    cashEstimate: null,
  },
]

const pricingSlides = [
  {
    title: 'Flight Instruction',
    detail: `$${FLIGHT_INSTRUCTION_RATE}/hr`,
    note: 'Same instruction rate across all training programs.',
  },
  {
    title: 'Airplane Rental',
    detail: AIRCRAFT_RENTAL_RATE_LABEL,
    note: 'Same aircraft rental rate no matter which training track you choose.',
  },
  {
    title: 'Private Pilot Training Time',
    detail: 'Required: 40 hrs | Typical: 60 hrs',
    note: 'Instruction time is typically 1.4x flight time, so 60 flight hours often means about 84 instruction hours.',
  },
  {
    title: 'Get Started Equipment Bundle',
    detail: `$${equipmentBundleTotal} total bundle`,
    note: `Headset: $${equipmentBundle.headset} | iPad: $${equipmentBundle.ipad} | ForeFlight: $${equipmentBundle.foreflight} | Private Pilot Checkride: $${equipmentBundle.privatePilotCheckride} | Written Exam: $${equipmentBundle.writtenExam} | Total: $${equipmentBundleTotal}`,
  },
]

export default function TrainingOptionsPage() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % pricingSlides.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [])

  const privateProgram = useMemo(() => programs.find((program) => program.name === 'Private Pilot'), [])
  const privateTypicalHours = privateProgram?.typicalHours ?? 60
  const privateInstructionHours = Math.round(privateTypicalHours * 1.4)

  return (
    <div className="min-h-screen bg-white">
      <section className="relative py-16 sm:py-20 overflow-hidden" style={{
        backgroundImage: "url('/images/hero-image.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="absolute inset-0 bg-black/75" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-block mb-4">
            <div className="w-16 h-1 bg-golden mx-auto rounded-full" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Training Options
          </h1>
          <p className="text-gray-200 max-w-3xl mx-auto text-base sm:text-lg font-light leading-relaxed">
            Compare certificate tracks and review how training costs are structured. Flight instruction stays fixed at $65/hr, and the aircraft rental rate stays the same across all programs.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-18 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-3">Program Tracks</h2>
            <p className="text-gray-600">Private, Instrument, Commercial, and Additional Training options.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {programs.map((program) => (
              <article key={program.name} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-xl font-bold text-black mb-2">{program.name}</h3>
                <p className="text-sm text-gray-600 mb-5 min-h-[64px]">{program.summary}</p>

                <div className="space-y-2 text-sm">
                  <p className="flex justify-between gap-4">
                    <span className="text-gray-500">Certificate Cost</span>
                    <span className="font-semibold text-black text-right">{program.certificateCost}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-gray-500">Instruction Rate</span>
                    <span className="font-semibold text-black">$65/hr</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-gray-500">Aircraft Rate</span>
                    <span className="font-semibold text-black">{AIRCRAFT_RENTAL_RATE_LABEL}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-gray-500">Required Hours</span>
                    <span className="font-semibold text-black">{program.requiredHours === null ? 'Varies' : `${program.requiredHours} hrs`}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-gray-500">Typical Hours</span>
                    <span className="font-semibold text-black">{program.typicalHours === null ? 'Varies' : `${program.typicalHours} hrs`}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-gray-500">Instruction Hours</span>
                    <span className="font-semibold text-black">{program.instructionHours === null ? 'Varies' : `${program.instructionHours} hrs`}</span>
                  </p>
                  <p className="flex justify-between gap-4 border-t border-gray-100 pt-2 mt-2">
                    <span className="text-gray-500">Est. Total (Card)</span>
                    <span className="font-semibold text-black">{program.cardEstimate === null ? 'Varies' : `$${program.cardEstimate.toLocaleString()}`}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-gray-500">Est. Total (Cash)</span>
                    <span className="font-semibold text-black">{program.cashEstimate === null ? 'Varies' : `$${program.cashEstimate.toLocaleString()}`}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-black text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Pricing Visual Walkthrough</h2>
            <p className="text-gray-300 text-sm sm:text-base">
              Scroll through the sequence to see instruction, aircraft, hours, and the startup bundle.
            </p>
          </div>

          <div className="relative">
            <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
              {pricingSlides.map((slide, index) => (
                <div
                  key={slide.title}
                  className={`min-w-full snap-start rounded-2xl border p-7 sm:p-10 transition-all duration-500 ${
                    index === activeSlide
                      ? 'border-golden bg-gradient-to-br from-gray-900 to-black shadow-[0_0_40px_rgba(197,154,42,0.2)]'
                      : 'border-gray-700 bg-gray-900/70'
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-golden mb-3">Step {index + 1}</p>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-3">{slide.title}</h3>
                  <p className="text-xl sm:text-2xl font-semibold text-golden mb-3">{slide.detail}</p>
                  <p className="text-gray-300 leading-relaxed">{slide.note}</p>

                  {slide.title === 'Private Pilot Training Time' && (
                    <div className="mt-6 bg-black/50 border border-gray-700 rounded-xl p-4 text-sm">
                      <p className="text-gray-200">Private example:</p>
                      <p className="text-gray-300 mt-1">Flight hours: {privateTypicalHours}</p>
                      <p className="text-gray-300">Instruction hours (1.4x): {privateInstructionHours}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              {pricingSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  className={`h-2.5 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-golden' : 'w-2.5 bg-gray-600'}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-golden/40 bg-golden/10 p-6 sm:p-8">
            <h3 className="text-2xl font-bold text-golden mb-2">Get Started Equipment Bundle</h3>
            <p className="text-gray-200 mb-4">This section mirrors the final slide at the bottom of the pricing animation.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <p className="flex justify-between border-b border-golden/20 pb-2"><span>Headset</span><span>${equipmentBundle.headset}</span></p>
              <p className="flex justify-between border-b border-golden/20 pb-2"><span>iPad</span><span>${equipmentBundle.ipad}</span></p>
              <p className="flex justify-between border-b border-golden/20 pb-2"><span>ForeFlight</span><span>${equipmentBundle.foreflight}</span></p>
              <p className="flex justify-between border-b border-golden/20 pb-2"><span>Private Pilot Checkride</span><span>${equipmentBundle.privatePilotCheckride}</span></p>
              <p className="flex justify-between border-b border-golden/20 pb-2"><span>Written Exam</span><span>${equipmentBundle.writtenExam}</span></p>
              <p className="flex justify-between font-semibold text-golden text-base"><span>Total</span><span>${equipmentBundleTotal}</span></p>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link href="https://app.merlinflighttraining.com/schedule" className="w-full sm:w-auto px-6 py-3 bg-golden text-black font-semibold rounded-lg text-center hover:bg-yellow-500 transition-colors">
              Book a Slot
            </Link>
            <Link href="/support" className="w-full sm:w-auto px-6 py-3 border border-gray-500 text-white font-semibold rounded-lg text-center hover:border-golden hover:text-golden transition-colors">
              Ask a Question
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
