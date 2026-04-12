"use client"
import { motion } from "framer-motion"
import Link from "next/link"
import BookingForm from "../components/BookingForm"
import PaymentForm from "../components/PaymentForm"
import { BookingProvider, useBooking } from "../contexts/BookingContext"

const BookingContent = () => {
  const { bookingStep, setBookingStep, bookingDetails, setBookingDetails } = useBooking()

  const handleBookingSubmit = (details: any) => {
    setBookingDetails(details)
    setBookingStep(2)
  }

  const handlePaymentSubmit = (paymentDetails: any) => {
    // Here you would typically send the booking and payment details to your server
    console.log("Booking:", bookingDetails)
    console.log("Payment:", paymentDetails)
    setBookingStep(3)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* Hero section */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-golden/80 mb-3">
          <Link href="/start-training" className="hover:text-golden transition">
            ← Back to Start Training
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
            Book Your Flight Lesson
          </span>
        </h1>
        <p className="mt-2 text-gray-400 text-sm sm:text-base max-w-2xl">
          Complete the steps below to schedule your lesson and get started on your pilot journey.
        </p>
      </div>

      {/* Main content area */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {/* Step 1: Booking Form */}
        {bookingStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <BookingForm onSubmit={handleBookingSubmit} />
          </motion.div>
        )}

        {/* Step 2: Payment Form */}
        {bookingStep === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PaymentForm onSubmit={handlePaymentSubmit} />
          </motion.div>
        )}

        {/* Step 3: Confirmation */}
        {bookingStep === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 sm:p-10 text-center">
              {/* Checkmark icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-golden/20 border border-golden/40 mb-6">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-golden"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              {/* Heading */}
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
                Booking Confirmed!
              </h2>

              {/* Description */}
              <p className="text-gray-300 text-sm sm:text-base mb-6 max-w-sm mx-auto">
                Thank you for booking your flight lesson. We look forward to seeing you in the skies!
              </p>

              {/* Booking details if available */}
              {bookingDetails && (
                <div className="mb-8 p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">
                    Booking Details
                  </p>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>
                      <span className="text-gray-400">Name:</span> {bookingDetails.name}
                    </p>
                    <p>
                      <span className="text-gray-400">Email:</span> {bookingDetails.email}
                    </p>
                    <p>
                      <span className="text-gray-400">Date:</span>{' '}
                      {bookingDetails.date instanceof Date
                        ? bookingDetails.date.toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : String(bookingDetails.date)}
                    </p>
                    <p>
                      <span className="text-gray-400">Time:</span> {bookingDetails.time}
                    </p>
                  </div>
                </div>
              )}

              {/* Confirmation message */}
              <p className="text-gray-400 text-sm mb-6">
                You will receive a confirmation email shortly with all the details of your booking.
              </p>

              {/* Action button */}
              <Link
                href="/start-training"
                className="inline-block bg-golden text-black font-bold py-3 px-8 rounded-xl hover:bg-yellow-500 transition"
              >
                Back to Start Training
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function Booking() {
  return (
    <BookingProvider>
      <BookingContent />
    </BookingProvider>
  )
}

