import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page Not Found | Merlin Flight Training",
  description: "The page you're looking for doesn't exist. Explore discovery flights, training options, and more at Merlin Flight Training.",
}

export default function NotFound() {
  return (
    <div className="min-h-[80vh] bg-black text-white flex flex-col items-center justify-center px-4 sm:px-6 relative overflow-hidden">
      {/* Subtle background pattern matching footer style */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="relative z-10 text-center max-w-xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/merlin-logo.png"
            alt="Merlin Flight Training"
            width={80}
            height={80}
            className="mx-auto"
          />
        </div>

        {/* 404 heading */}
        <h1 className="text-7xl sm:text-8xl font-bold bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent mb-4">
          404
        </h1>
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3">
          Off Course
        </h2>
        <p className="text-gray-400 text-base sm:text-lg mb-10 max-w-md mx-auto leading-relaxed">
          Looks like this page has gone off the radar. Let&apos;s get you back on your flight plan.
        </p>

        {/* Navigation links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 max-w-md mx-auto">
          <Link
            href="/discovery-flight"
            className="group flex items-center justify-center gap-2 bg-golden text-black font-semibold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-all duration-300"
          >
            <span>✈</span>
            <span>Discovery Flights</span>
          </Link>
          <Link
            href="/training-options"
            className="group flex items-center justify-center gap-2 border border-golden text-golden font-semibold py-3 px-6 rounded-lg hover:bg-golden hover:text-black transition-all duration-300"
          >
            <span>🎓</span>
            <span>Training Options</span>
          </Link>
          <Link
            href="/faq"
            className="group flex items-center justify-center gap-2 border border-gray-600 text-gray-300 font-medium py-3 px-6 rounded-lg hover:border-golden hover:text-golden transition-all duration-300"
          >
            <span>❓</span>
            <span>FAQ</span>
          </Link>
          <Link
            href="/"
            className="group flex items-center justify-center gap-2 border border-gray-600 text-gray-300 font-medium py-3 px-6 rounded-lg hover:border-golden hover:text-golden transition-all duration-300"
          >
            <span>🏠</span>
            <span>Home</span>
          </Link>
        </div>

        {/* Contact line */}
        <p className="text-gray-500 text-sm">
          Need help?{" "}
          <a
            href="tel:+19294874717"
            className="text-golden hover:text-yellow-400 transition-colors duration-300"
          >
            (929) 487-4717
          </a>
        </p>
      </div>
    </div>
  )
}
