"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

interface BookingContextType {
  bookingStep: number
  setBookingStep: React.Dispatch<React.SetStateAction<number>>
  bookingDetails: any
  setBookingDetails: React.Dispatch<React.SetStateAction<any>>
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookingStep, setBookingStep] = useState(1)
  const [bookingDetails, setBookingDetails] = useState(null)

  return (
    <BookingContext.Provider value={{ bookingStep, setBookingStep, bookingDetails, setBookingDetails }}>
      {children}
    </BookingContext.Provider>
  )
}

export const useBooking = () => {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider")
  }
  return context
}

