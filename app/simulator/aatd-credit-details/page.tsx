import Link from 'next/link'

export default function AatdCreditDetailsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-golden hover:text-darkText font-semibold transition-colors">
            {'<-'} Back to Home
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-10 border border-gray-200">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-darkText mb-3">
              FAA AATD Credit Details
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Redbird LD, SD, FMX, and MCX models are approved by FAA as Advanced Aviation Training Devices (AATD),
              per Letter of Authorization dated October 21, 2021.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-darkText mb-4">Part 61 Credit Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="py-3 pr-4 text-sm font-semibold text-gray-700">Regulation</th>
                    <th className="py-3 pr-4 text-sm font-semibold text-gray-700">Training/Credit</th>
                    <th className="py-3 text-sm font-semibold text-gray-700">Maximum</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4">61.65(i)</td>
                    <td className="py-3 pr-4">Instrument Rating</td>
                    <td className="py-3">Up to 20 hours</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4">61.109(k)(1)</td>
                    <td className="py-3 pr-4">Private Pilot Aeronautical Experience</td>
                    <td className="py-3">Up to 2.5 hours</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4">61.129(i)(1)(i)</td>
                    <td className="py-3 pr-4">Commercial Pilot Certificate</td>
                    <td className="py-3">Up to 50 hours</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4">61.159(a)(4)(i)</td>
                    <td className="py-3 pr-4">Airline Transport Pilot Certificate</td>
                    <td className="py-3">Up to 25 hours</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4">61.57(c)</td>
                    <td className="py-3 pr-4">Instrument Experience</td>
                    <td className="py-3">As allowed by regulation</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4">61.57(d)(1)</td>
                    <td className="py-3 pr-4">Instrument Proficiency Check (per Instrument ACS)</td>
                    <td className="py-3">As allowed by regulation</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4">61.51(b)(3), 61.51(h)</td>
                    <td className="py-3 pr-4">Logbook Entries and Logging Training Time</td>
                    <td className="py-3">As allowed by regulation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-darkText mb-4">Part 141 Credit Highlights</h2>
            <ul className="space-y-2 text-gray-700">
              <li>Appendix B: Up to 15% toward total Private Pilot training time requirements</li>
              <li>Appendix C: Up to 40% toward total Instrument training time requirements</li>
              <li>Appendix D: Up to 20% toward total Commercial Pilot training time requirements</li>
              <li>Appendix E: Up to 25% toward total ATP training time requirements</li>
              <li>Appendix F: Up to 5% toward total Flight Instructor training time requirements</li>
              <li>Appendix G: Up to 5% toward total Flight Instructor Instrument training time requirements</li>
              <li>Appendix I and Appendix M: Additional add-on and combined course credits as listed in the FAA LOA</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-darkText mb-4">Important Limitations</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
              <ul className="space-y-2 text-gray-800">
                <li>Cross-country, night, solo, takeoffs/landings, and required practical test prep elements must be completed in aircraft.</li>
                <li>Private Pilot applicants must complete required instrument control/maneuvering airplane time in an actual airplane.</li>
                <li>No portion of a practical test or type-specific training credit can be conducted in an AATD.</li>
                <li>The flight portion of a flight review under 61.56(a) cannot be completed in an AATD.</li>
                <li>Only appropriately qualified FAA-certificated instructors may make instructional endorsements/logbook entries.</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-darkText mb-4">Approval Period</h2>
            <p className="text-gray-700 leading-relaxed">
              The FAA letter states this approval expires on October 31, 2026. If you are viewing this after that date,
              please contact us to confirm current authorization status.
            </p>
          </section>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="https://app.merlinflighttraining.com/schedule"
              className="inline-block bg-golden hover:bg-golden/90 text-black font-bold py-3 px-6 rounded-lg transition-colors text-center"
            >
              Book Simulator Time ($75/hr)
            </Link>
            <Link
              href="/"
              className="inline-block border border-darkText text-darkText hover:bg-darkText hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
