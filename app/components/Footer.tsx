import Link from "next/link"

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white p-4 mt-8">
      <div className="container mx-auto flex justify-between items-center">
        <p>&copy; 2023 Isaac's Flight School. All rights reserved.</p>
        <ul className="flex space-x-4">
          <li>
            <Link href="/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link href="/terms">Terms of Service</Link>
          </li>
          <li>
            <Link href="/contact">Contact Us</Link>
          </li>
          <li>
            <Link href="mailto:isaacthecfi@gmail.com">Contact: isaacthecfi@gmail.com</Link>
          </li>
        </ul>
      </div>
    </footer>
  )
}

export default Footer

