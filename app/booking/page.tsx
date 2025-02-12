"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import BookingForm from "../components/BookingForm"
import PaymentForm from "../components/PaymentForm"

interface BookingDetails {
  date: Date
  time: string
  name: string
  email: string
}

interface PaymentDetails {
  cardNumber: string
  expiry: string
  cvc: string
}

export default function Booking() {
  const [bookingStep, setBookingStep] = useState(1)
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null)

  const handleBookingSubmit = (details: BookingDetails) => {
    setBookingDetails(details)
    setBookingStep(2)
  }

  const handlePaymentSubmit = (paymentDetails: PaymentDetails) => {
    // Here you would typically send the booking and payment details to your server
    console.log("Booking:", bookingDetails)
    console.log("Payment:", paymentDetails)
    setBookingStep(3)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Book Your Flight Lesson</h1>

      {bookingStep === 1 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <BookingForm onSubmit={handleBookingSubmit} />
        </motion.div>
      )}

      {bookingStep === 2 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <PaymentForm onSubmit={handlePaymentSubmit} />
        </motion.div>
      )}

      {bookingStep === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold mb-4">Booking Confirmed!</h2>
          <p className="mb-4">Thank you for booking your flight lesson. We look forward to seeing you in the skies!</p>
          <p>You will receive a confirmation email shortly with all the details of your booking.</p>
        </motion.div>
      )}
    </div>
  )
}

