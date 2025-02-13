import Link from "next/link"

export default function Custom404() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-6xl font-bold">404</h1>
      <h2 className="text-2xl mt-3 mb-5">Page Not Found</h2>
      <p className="mb-5">The page you're looking for doesn't exist or has been moved.</p>
      <Link href="/" className="text-blue-500 hover:text-blue-700">
        Go back home
      </Link>
    </div>
  )
}

