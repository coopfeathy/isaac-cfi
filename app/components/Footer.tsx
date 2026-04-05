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
              Professional flight training and personalized discovery flights in New York.
            </p>
            <a
              href="https://maps.google.com/?q=208+NY-109+Farmingdale+NY+11735"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base"
            >
              208 NY-109, Farmingdale, NY 11735
            </a>
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
                <Link href="/learn" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base">
                  Learn
                </Link>
              </li>
              <li>
                <Link href="/store" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base">
                  Pilot Store
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base">
                  Support
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-golden">Connect</h4>
            <div className="space-y-4">
              <div className="space-y-2 sm:space-y-3">
                <a href="mailto:merlinflighttraining@gmail.com" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base block">
                  merlinflighttraining@gmail.com
                </a>
                <a href="tel:+19294874717" className="text-gray-400 hover:text-golden transition-colors duration-300 font-light text-sm sm:text-base block">
                  +1 (929) 487-4717
                </a>
              </div>
              <div className="flex gap-4 pt-2">
                <a href="https://www.facebook.com/people/Merlin-Flight-Training/61584960395153" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-golden transition-colors duration-300" title="Facebook">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://www.instagram.com/merlinflighttraining" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-golden transition-colors duration-300" title="Instagram">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/></svg>
                </a>
                <a href="https://www.linkedin.com/company/merlin-flight-training" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-golden transition-colors duration-300" title="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="https://www.youtube.com/@MerlinFlightTraining" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-golden transition-colors duration-300" title="YouTube">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="https://www.tiktok.com/@isaacthecfi" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-golden transition-colors duration-300" title="TikTok">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.75 2.9 2.9 0 0 1 2.31-4.64 2.88 2.88 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.01-.01z"/></svg>
                </a>
              </div>
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

