'use client'

import Link from 'next/link'

export default function BookingSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-darkText mb-4">
            Booking Confirmed!
          </h1>
          
          <p className="text-gray-600 mb-8">
            Thank you for booking with Merlin Flight Training. You'll receive a confirmation email shortly with all the details for your flight.
          </p>

          <div className="space-y-4">
            <Link
              href="/bookings"
              className="block w-full px-6 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90 transition-colors"
            >
              View My Bookings
            </Link>
            <Link
              href="/schedule"
              className="block w-full px-6 py-3 bg-gray-100 text-darkText font-bold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Book Another Flight
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
