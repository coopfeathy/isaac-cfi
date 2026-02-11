"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext"
import { useState } from "react"

const Header = () => {
  const { user, signOut, isAdmin } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <motion.header
      className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <nav className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center group-hover:bg-golden transition-all duration-300">
              <span className="text-golden text-lg sm:text-xl group-hover:text-black transition-colors duration-300">✈</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-black tracking-tight">
              <span className="hidden sm:inline">Merlin Flight Training</span>
              <span className="sm:hidden">Merlin</span>
            </div>
          </Link>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop navigation - shows at 640px+ */}
          <ul className="hidden sm:flex space-x-2 md:space-x-4 lg:space-x-6 xl:space-x-8 items-center">
            <li>
              <Link href="/" className="text-gray-700 hover:text-golden transition-all duration-300 font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
                Home
              </Link>
            </li>
            <li>
              <Link href="/schedule" className="text-gray-700 hover:text-golden transition-all duration-300 font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
                Schedule
              </Link>
            </li>
            <li>
              <Link href="/blog" className="text-gray-700 hover:text-golden transition-all duration-300 font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/instructors" className="text-gray-700 hover:text-golden transition-all duration-300 font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
                Instructors
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="text-gray-700 hover:text-golden transition-all duration-300 font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/apply" className="text-gray-700 hover:text-golden transition-all duration-300 font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
                Apply
              </Link>
            </li>
            <li>
              <Link href="/faq" className="text-gray-700 hover:text-golden transition-all duration-300 font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
                FAQ
              </Link>
            </li>
            
            {user ? (
              <>
                <li>
                  <Link href="/bookings" className="text-gray-700 hover:text-golden transition-all duration-300 font-medium">
                    My Bookings
                  </Link>
                </li>
                {isAdmin && (
                  <li>
                    <Link href="/admin" className="text-gray-700 hover:text-golden transition-all duration-300 font-medium">
                      Admin
                    </Link>
                  </li>
                )}
                <li>
                  <button
                    onClick={() => signOut()}
                    className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 font-medium"
                  >
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/login"
                  className="px-8 py-2.5 bg-black text-white rounded-lg hover:bg-golden hover:text-black transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
                >
                  Sign In
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden mt-4 pb-4 border-t border-gray-200 pt-4"
          >
            <ul className="space-y-2">
              <li>
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-golden hover:bg-golden/5 transition-all duration-300 font-medium px-4 py-3 rounded-lg">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/schedule" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-golden hover:bg-golden/5 transition-all duration-300 font-medium px-4 py-3 rounded-lg">
                  Schedule
                </Link>
              </li>
              <li>
                <Link href="/blog" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-golden hover:bg-golden/5 transition-all duration-300 font-medium px-4 py-3 rounded-lg">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/instructors" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-golden hover:bg-golden/5 transition-all duration-300 font-medium px-4 py-3 rounded-lg">
                  Instructors
                </Link>
              </li>
              <li>
                <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-golden hover:bg-golden/5 transition-all duration-300 font-medium px-4 py-3 rounded-lg">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/apply" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-golden hover:bg-golden/5 transition-all duration-300 font-medium px-4 py-3 rounded-lg">
                  Apply
                </Link>
              </li>
              <li>
                <Link href="/faq" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-golden hover:bg-golden/5 transition-all duration-300 font-medium px-4 py-3 rounded-lg">
                  FAQ
                </Link>
              </li>
              
              {user ? (
                <>
                  <li>
                    <Link href="/bookings" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-golden hover:bg-golden/5 transition-all duration-300 font-medium px-4 py-3 rounded-lg">
                      My Bookings
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-golden hover:bg-golden/5 transition-all duration-300 font-medium px-4 py-3 rounded-lg">
                        Admin
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 font-medium"
                    >
                      Sign Out
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center px-4 py-3 bg-black text-white rounded-lg hover:bg-golden hover:text-black transition-all duration-300 font-semibold shadow-md"
                  >
                    Sign In
                  </Link>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </nav>
    </motion.header>
  )
}

export default Header

