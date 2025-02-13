"use client"

import React, { createContext, useState, ReactNode } from 'react';

interface BookingContextType {
  bookingStep: number
  setBookingStep: React.Dispatch<React.SetStateAction<number>>
  bookingDetails: any
  setBookingDetails: React.Dispatch<React.SetStateAction<any>>
}

const BookingContext = React.createContext<BookingContextType | undefined>(undefined)

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookingStep, setBookingStep] = React.useState(1)
  const [bookingDetails, setBookingDetails] = React.useState(null)

  return (
    <BookingContext.Provider value={{ bookingStep, setBookingStep, bookingDetails, setBookingDetails }}>
      {children}
    </BookingContext.Provider>
  )
}

export const useBooking = () => {
  const context = React.useContext(BookingContext)
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider")
  }
  return context
}

