"use client"

import { useState } from "react"
import { motion } from "framer-motion"

const PaymentForm = ({ onSubmit }) => {
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ cardNumber, expiry, cvc })
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
        <label htmlFor="cardNumber" className="block mb-2">
          Card Number
        </label>
        <input
          type="text"
          id="cardNumber"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          required
          className="w-full p-2 border rounded"
          placeholder="1234 5678 9012 3456"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="expiry" className="block mb-2">
          Expiry Date
        </label>
        <input
          type="text"
          id="expiry"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          required
          className="w-full p-2 border rounded"
          placeholder="MM/YY"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="cvc" className="block mb-2">
          CVC
        </label>
        <input
          type="text"
          id="cvc"
          value={cvc}
          onChange={(e) => setCvc(e.target.value)}
          required
          className="w-full p-2 border rounded"
          placeholder="123"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition duration-300"
      >
        Pay Deposit
      </button>
    </motion.form>
  )
}

export default PaymentForm

