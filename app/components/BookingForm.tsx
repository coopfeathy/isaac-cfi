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
      className="max-w-md mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-4">
        <label htmlFor="date" className="block text-gray-700 font-bold mb-2">
          Date:
        </label>
        <DatePicker
          id="date"
          selected={date}
          onChange={(date: Date | null) => setDate(date || new Date())}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="time" className="block text-gray-700 font-bold mb-2">
          Time:
        </label>
        <input
          type="time"
          id="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-700 font-bold mb-2">
          Name:
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Your Name"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="email" className="block text-gray-700 font-bold mb-2">
          Email:
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Your Email"
        />
      </div>
      {error && <p className="text-red-500 text-center">{error}</p>}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {isLoading ? "Booking..." : "Book Now"}
        </button>
      </div>
    </motion.form>
  )
}

export default BookingForm

