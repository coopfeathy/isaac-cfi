import Link from "next/link"

const Footer = () => {
  return (
    <footer className="bg-black text-white py-12 sm:py-16 mt-auto relative overflow-hidden">
      {/* Subtle Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }} />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-golden rounded-lg flex items-center justify-center">
                <span className="text-black text-lg sm:text-xl">✈</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold">Merlin Flight Training</h3>
            </div>
            <p className="text-gray-400 font-light leading-relaxed text-sm sm:text-base">
              Professional flight training and unforgettable aerial tours over New York City.
            </p>
          </div>
          
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-golden">Quick Links</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/schedule" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base">
                  Schedule a Flight
                </Link>
              </li>
              <li>
                <Link href="/aircraft" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base">
                  Our Aircraft
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-golden">Contact</h4>
            <div className="space-y-2 sm:space-y-3">
              <a href="mailto:MerlinFlightTraining@gmail.com" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base block">
                MerlinFlightTraining@gmail.com
              </a>
              <a href="tel:+12083012629" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base block">
                +1 (208) 301-2629
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-6 sm:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-xs sm:text-sm font-light text-center md:text-left">&copy; {new Date().getFullYear()} Merlin Flight Training. All rights reserved.</p>
            <div className="md:mt-0">
              <div className="h-px w-24 sm:w-32 bg-gradient-to-r from-transparent via-golden to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

