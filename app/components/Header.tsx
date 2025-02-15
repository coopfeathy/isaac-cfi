"use client"

import Link from "next/link"
import { motion } from "framer-motion"

const Header = () => {
  return (
    <motion.header
      className="bg-blue-600 text-white p-4"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          Isaac's Flight School
        </Link>
        <ul className="flex space-x-4">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/lessons">Lessons</Link>
          </li>
          <li>
            <Link href="/booking">Book Now</Link>
          </li>
          <li>
            <Link href="/faq">FAQ</Link>
          </li>
        </ul>
      </nav>
    </motion.header>
  )
}

export default Header

