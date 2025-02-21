import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"

const DynamicMotionSection = dynamic(() => import("./components/MotionSection"), { ssr: false })

export default function Home() {
  return (
    <div className="container mx-auto px-4">
      <DynamicMotionSection
        className="text-center py-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-4">Start Your Journey to the Skies with Isaac</h1>
        <p className="text-xl mb-8">Book your flight lessons today and experience the thrill of flying!</p>
        <Link
          href="/booking"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition duration-300"
        >
          Book Now
        </Link>
      </DynamicMotionSection>

      <DynamicMotionSection
        className="grid md:grid-cols-3 gap-8 py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="text-center">
          <Image
            src="/placeholder.svg?height=100&width=100"
            alt="Experienced Instructors"
            width={100}
            height={100}
            className="mx-auto mb-4"
          />
          <h2 className="text-2xl font-semibold mb-2">Experienced Instructors</h2>
          <p>Learn from the best in the industry with our certified flight instructors.</p>
        </div>
        <div className="text-center">
          <Image
            src="/placeholder.svg?height=100&width=100"
            alt="Modern Fleet"
            width={100}
            height={100}
            className="mx-auto mb-4"
          />
          <h2 className="text-2xl font-semibold mb-2">Modern Fleet</h2>
          <p>Train on our well-maintained, state-of-the-art aircraft for the best learning experience.</p>
        </div>
        <div className="text-center">
          <Image
            src="/placeholder.svg?height=100&width=100"
            alt="Flexible Scheduling"
            width={100}
            height={100}
            className="mx-auto mb-4"
          />
          <h2 className="text-2xl font-semibold mb-2">Flexible Scheduling</h2>
          <p>Choose from a variety of time slots that fit your busy lifestyle.</p>
        </div>
      </DynamicMotionSection>
    </div>
  )
}

