"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { useBooking } from "../contexts/BookingContext"

interface BookingDetails {
  date: Date
  time: string
  name: string
  email: string
}

interface BookingFormProps {
  onSubmit: (details: BookingDetails) => void
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmit }) => {
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const { setBookingStep } = useBooking()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/.netlify/functions/book", {
        method: "POST",
        body: JSON.stringify({ date: date.toISOString().split("T")[0], time, name, email }),
      })

      const data = await response.json()

      if (data.success) {
        onSubmit({ date, time, name, email })
        setBookingStep(2)
      } else {
        setError("Booking failed. Please try again.")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    }

    setIsLoading(false)
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto px-4 sm:px-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 space-y-5">
        {/* Date field */}
        <label className="block">
          <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-1.5">
            Date
          </div>
          <DatePicker
            selected={date}
            onChange={(date: Date | null) => setDate(date || new Date())}
            className="datepicker-input"
          />
        </label>

        {/* Time field */}
        <label className="block">
          <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-1.5">
            Time
          </div>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="time-input"
          />
        </label>

        {/* Name field */}
        <label className="block">
          <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-1.5">
            Full Name
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="form-input"
          />
        </label>

        {/* Email field */}
        <label className="block">
          <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-1.5">
            Email
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="form-input"
          />
        </label>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        <div className="flex pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-golden text-black font-bold py-3 rounded-xl hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isLoading ? "Booking..." : "Continue to Payment"}
          </button>
        </div>
      </div>

      {/* Dark theme input and datepicker styles */}
      <style jsx>{`
        .form-input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .form-input:focus {
          border-color: rgba(234, 179, 8, 0.7);
          background: rgba(255, 255, 255, 0.09);
        }

        .time-input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .time-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .time-input:focus {
          border-color: rgba(234, 179, 8, 0.7);
          background: rgba(255, 255, 255, 0.09);
        }

        .datepicker-input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .datepicker-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .datepicker-input:focus {
          border-color: rgba(234, 179, 8, 0.7);
          background: rgba(255, 255, 255, 0.09);
        }

        /* React DatePicker dark theme overrides */
        :global(.react-datepicker-wrapper) {
          width: 100%;
        }

        :global(.react-datepicker) {
          background: rgba(26, 26, 26, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.75rem;
          color: white;
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }

        :global(.react-datepicker__header) {
          background: rgba(255, 255, 255, 0.06);
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          padding-top: 0.875rem;
        }

        :global(.react-datepicker__current-month) {
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
        }

        :global(.react-datepicker__navigation) {
          line-height: 1.5rem;
        }

        :global(.react-datepicker__navigation-icon::before) {
          border-color: rgba(255, 255, 255, 0.5);
        }

        :global(.react-datepicker__navigation--previous) {
          left: 0.75rem;
        }

        :global(.react-datepicker__navigation--next) {
          right: 0.75rem;
        }

        :global(.react-datepicker__day-names) {
          padding: 0.75rem 0;
        }

        :global(.react-datepicker__day-name) {
          color: rgba(255, 255, 255, 0.5);
          width: 2.25rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        :global(.react-datepicker__month) {
          padding: 0.5rem;
        }

        :global(.react-datepicker__week) {
          padding: 0;
        }

        :global(.react-datepicker__day) {
          width: 2.25rem;
          line-height: 2.25rem;
          margin: 0.25rem;
          color: white;
          border-radius: 0.375rem;
          transition: all 0.15s ease;
        }

        :global(.react-datepicker__day--selected),
        :global(.react-datepicker__day--in-selecting-range),
        :global(.react-datepicker__day--in-range) {
          background: rgba(234, 179, 8, 0.8);
          color: black;
          font-weight: 600;
        }

        :global(.react-datepicker__day--today) {
          background: rgba(239, 68, 68, 0.3);
          color: rgba(248, 113, 113, 1);
          font-weight: 600;
          border: 1px solid rgba(248, 113, 113, 0.4);
        }

        :global(.react-datepicker__day--outside-month) {
          color: rgba(255, 255, 255, 0.25);
        }

        :global(.react-datepicker__day:hover) {
          background: rgba(255, 255, 255, 0.1);
        }

        :global(.react-datepicker__day--disabled) {
          color: rgba(255, 255, 255, 0.2);
          cursor: not-allowed;
        }

        :global(.react-datepicker__input-container) {
          position: relative;
        }
      `}</style>
    </motion.form>
  )
}

export default BookingForm

