import Link from "next/link"

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-6">
          <div>
            <h3 className="text-xl font-bold mb-4 text-golden">Merlin Flight Training</h3>
            <p className="text-gray-400">
              Professional flight training and breathtaking NYC tours.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/schedule" className="text-gray-400 hover:text-golden transition-colors">
                  Schedule a Flight
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-golden transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-golden transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Email: contact@merlinflighttraining.com</li>
              <li>Phone: (555) 123-4567</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-6 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Merlin Flight Training. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

