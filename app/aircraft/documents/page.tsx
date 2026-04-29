import Link from 'next/link'

export default function AircraftDocumentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/aircraft" className="text-golden hover:text-darkText font-semibold transition-colors">
            {'<-'} Back to Aircraft
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-10 border border-gray-200">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-darkText mb-3">
              Aircraft Documents
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Review the documentation details for our current training aircraft.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-darkText mb-4">N9725U</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <ul className="space-y-2 text-gray-700">
                <li>Airworthiness and registration records are maintained and current.</li>
                <li>Maintenance and inspection logs are available for operational review.</li>
                <li>Aircraft details and equipment status are provided before dispatch.</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-darkText mb-4">Need Specific Records?</h2>
            <p className="text-gray-700 leading-relaxed">
              If you need a specific document packet before your session, contact us and we will provide the exact records needed for your training or rental context.
            </p>
          </section>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="https://app.merlinflighttraining.com/schedule"
              className="inline-block bg-golden hover:bg-golden/90 text-black font-bold py-3 px-6 rounded-lg transition-colors text-center"
            >
              Book a Flight Session
            </Link>
            <Link
              href="/support"
              className="inline-block border border-darkText text-darkText hover:bg-darkText hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
            >
              Request Documents
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
