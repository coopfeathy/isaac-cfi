"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext"

const Header = () => {
  const { user, signOut, isAdmin } = useAuth()

  return (
    <motion.header
      className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <nav className="container mx-auto px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <div className="text-2xl font-bold text-darkText">
            <span className="text-golden text-3xl">✈</span>{" "}
            <span className="text-golden">Merlin</span> Flight Training
          </div>
        </Link>
        
        <ul className="flex space-x-6 items-center">
          <li>
            <Link href="/" className="text-darkText hover:text-golden transition-all font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
              Home
            </Link>
          </li>
          <li>
            <Link href="/schedule" className="text-darkText hover:text-golden transition-all font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
              Schedule
            </Link>
          </li>
          <li>
            <Link href="/blog" className="text-darkText hover:text-golden transition-all font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
              Blog
            </Link>
          </li>
          <li>
            <Link href="/faq" className="text-darkText hover:text-golden transition-all font-medium px-3 py-2 rounded-lg hover:bg-golden/5">
              FAQ
            </Link>
          </li>
          
          {user ? (
            <>
              <li>
                <Link href="/bookings" className="text-darkText hover:text-golden transition-colors font-medium">
                  My Bookings
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link href="/admin" className="text-darkText hover:text-golden transition-colors font-medium">
                    Admin
                  </Link>
                </li>
              )}
              <li>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 bg-gray-200 text-darkText rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link
                href="/login"
                className="px-6 py-2.5 bg-golden text-darkText rounded-lg hover:bg-yellow-500 transition-all font-bold shadow-md hover:shadow-lg"
              >
                Sign In
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </motion.header>
  )
}

export default Header

