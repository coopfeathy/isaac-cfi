"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

const BookingForm = ({ onSubmit }) => {
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ date, time, name, email })
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
        <label htmlFor="name" className="block mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="email" className="block mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="date" className="block mb-2">
          Date
        </label>
        <DatePicker selected={date} onChange={(date) => setDate(date)} className="w-full p-2 border rounded" />
      </div>
      <div className="mb-4">
        <label htmlFor="time" className="block mb-2">
          Time
        </label>
        <select
          id="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          className="w-full p-2 border rounded"
        >
          <option value="">Select a time</option>
          <option value="09:00">09:00 AM</option>
          <option value="11:00">11:00 AM</option>
          <option value="13:00">01:00 PM</option>
          <option value="15:00">03:00 PM</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition duration-300"
      >
        Proceed to Payment
      </button>
    </motion.form>
  )
}

export default BookingForm

