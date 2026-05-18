import Link from "next/link"
import type { Metadata } from "next"

// Print-friendly digital brochure at /brochure. Replaces the "PDF attachment"
// pattern competitors use — same content, but as a URL we can track clicks
// on, and easier for prospects to share. The page is designed to print-to-PDF
// cleanly (single column, print stylesheet, no nav chrome) so Isaac can save
// a PDF version on demand from any browser.

export const metadata: Metadata = {
  title: "Merlin Flight Training — Program Brochure",
  description:
    "Programs, aircraft, pricing, and the path to your pilot license at Northeast Philadelphia Airport (KPNE).",
  alternates: {
    canonical: "https://merlinflighttraining.com/brochure",
  },
  robots: {
    index: false,  // brochure is for prospects, not search
    follow: false,
  },
}

export default function BrochurePage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12pt; }
          .brochure-page { padding: 0 !important; max-width: none !important; }
          h1, h2 { page-break-after: avoid; }
          .brochure-section { page-break-inside: avoid; }
        }
      `}} />

      {/* Print/share controls — hidden on print */}
      <div className="no-print bg-black text-white py-3 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-10">
        <span className="text-sm sm:text-base font-semibold">
          Merlin Flight Training · Program Brochure
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-golden text-black px-4 py-2 rounded text-sm font-semibold hover:bg-yellow-500 transition-colors"
            style={{ fontFamily: 'inherit' }}
          >
            Save as PDF
          </button>
          <Link
            href="/discovery-flight-funnel"
            className="border border-golden text-golden px-4 py-2 rounded text-sm font-semibold hover:bg-golden hover:text-black transition-colors"
          >
            Book Discovery Flight
          </Link>
        </div>
      </div>

      <div className="brochure-page max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">

        {/* Cover */}
        <section className="brochure-section text-center mb-16 pb-12 border-b border-gray-200">
          <p className="text-golden font-bold text-xs uppercase tracking-widest mb-3">
            Program Brochure · 2026
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight">
            Merlin Flight Training
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 font-light max-w-2xl mx-auto leading-relaxed mb-6">
            Programs, aircraft, pricing, and the path to your pilot license at
            Northeast Philadelphia Airport (KPNE).
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 mt-4 px-4 py-2 bg-gray-50 rounded">
            <span>9800 Ashton Rd · Philadelphia, PA 19114 · KPNE</span>
          </div>
        </section>

        {/* Intro */}
        <section className="brochure-section mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Who we are
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-gray-800 mb-4">
            Merlin Flight Training is an FAA-certified Part 61 flight school
            based at Northeast Philadelphia Airport (KPNE). We train pilots
            one-on-one in a Grumman Cheetah AA-5A. No big classes, no waiting
            in line for an instructor, no surprise fees.
          </p>
          <p className="text-base sm:text-lg leading-relaxed text-gray-800 mb-4">
            I'm <strong>Isaac Prestwich, CFII</strong> — the owner and
            chief instructor. I personally fly with every student through
            their first lessons, so we're on the same page about how we teach.
            I read every email. I do every standardization ride. When you
            call, I answer.
          </p>
          <p className="text-base sm:text-lg leading-relaxed text-gray-800">
            We&apos;re a small operation by choice. One airplane. One CFII.
            A capped student roster so every student gets time on the plane
            every week.
          </p>
        </section>

        {/* The path */}
        <section className="brochure-section mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            The path from interested to certificated
          </h2>
          <ol className="space-y-5 text-base sm:text-lg text-gray-800">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-golden text-black font-bold flex items-center justify-center text-base">01</span>
              <div>
                <strong className="block text-black mb-1">Discovery flight — $150</strong>
                <span className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  Your first flight in the airplane. ~60 minutes airborne over
                  Center City Philadelphia and the Delaware River. You sit in
                  the left seat, you fly. No experience needed.
                </span>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-golden text-black font-bold flex items-center justify-center text-base">02</span>
              <div>
                <strong className="block text-black mb-1">FAA medical certificate</strong>
                <span className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  Application via MedXPress + in-person exam with an Aviation
                  Medical Examiner. 4–6 week lead time, $150–$200. Start this
                  early.
                </span>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-golden text-black font-bold flex items-center justify-center text-base">03</span>
              <div>
                <strong className="block text-black mb-1">Student Pilot Certificate</strong>
                <span className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  Apply through IACRA. We walk you through it. No fee from us;
                  the FAA fee is nominal.
                </span>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-golden text-black font-bold flex items-center justify-center text-base">04</span>
              <div>
                <strong className="block text-black mb-1">Training — flights + ground school</strong>
                <span className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  50–70 hours in the airplane over 6–12 months. Ground school
                  runs in parallel — covered by our 3.5-week live online
                  cohorts or self-paced with us.
                </span>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-golden text-black font-bold flex items-center justify-center text-base">05</span>
              <div>
                <strong className="block text-black mb-1">FAA Knowledge Test</strong>
                <span className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  70-question written exam. $175 at any PSI testing center.
                  Take it after ~20 hours of training, not at the end.
                </span>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-golden text-black font-bold flex items-center justify-center text-base">06</span>
              <div>
                <strong className="block text-black mb-1">Checkride</strong>
                <span className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  Oral + practical exam with a Designated Pilot Examiner.
                  Pass it and you&apos;re a Private Pilot.
                </span>
              </div>
            </li>
          </ol>
        </section>

        {/* Aircraft */}
        <section className="brochure-section mb-12 bg-gray-50 p-6 sm:p-8 rounded-lg">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            The aircraft: Grumman Cheetah AA-5A
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-gray-800 mb-4">
            Most schools in the Philadelphia area fly Cessna 172s. We picked
            the Cheetah deliberately. It&apos;s a sportier, faster trainer
            that teaches you to fly the airplane rather than fly past your
            mistakes. The control feel is honest — what you do with the
            stick is what the airplane does.
          </p>
          <ul className="space-y-1 text-sm sm:text-base text-gray-700 mt-4">
            <li>• Tail number: <strong>N9725U</strong></li>
            <li>• Type: Grumman American AA-5A Cheetah</li>
            <li>• IFR-equipped</li>
            <li>• Well-maintained, flown weekly, never on the &quot;squawk and pray&quot; plan</li>
            <li>• Hangared at KPNE</li>
          </ul>
        </section>

        {/* Programs */}
        <section className="brochure-section mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">
            Programs offered
          </h2>
          <div className="space-y-6">
            <div className="border-l-4 border-golden pl-5">
              <h3 className="text-xl font-bold mb-1">Private Pilot Certificate</h3>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                The certificate that makes you a pilot. ~50–70 flight hours,
                ground school, FAA written exam, and a checkride. End-to-end
                cost: <strong>$13,000–$14,000</strong>. Timeline: 6–12 months
                while working a day job.
              </p>
            </div>
            <div className="border-l-4 border-golden pl-5">
              <h3 className="text-xl font-bold mb-1">Instrument Rating</h3>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                After your PPL. Fly in clouds and low visibility. ~50 hours of
                instrument training, instrument written, IR checkride.
                Estimated cost: <strong>~$12,000</strong>.
              </p>
            </div>
            <div className="border-l-4 border-golden pl-5">
              <h3 className="text-xl font-bold mb-1">Commercial Pilot Certificate</h3>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                The certificate that lets you get paid to fly. ~120 hours
                including specific maneuvers and cross-country experience.
                On-ramp to a paid aviation career.
              </p>
            </div>
            <div className="border-l-4 border-golden pl-5">
              <h3 className="text-xl font-bold mb-1">Online Ground School</h3>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                Live 3.5-week cohorts. Mon + Wed evenings, 6–9 PM Eastern.
                20 hours of instruction. $800 full course or $215/week. Pass
                the FAA written exam and walk out with a certificate of
                completion.
              </p>
            </div>
          </div>
        </section>

        {/* Rates */}
        <section className="brochure-section mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Transparent rates
          </h2>
          <table className="w-full text-left text-sm sm:text-base">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 pr-4 font-bold">Item</th>
                <th className="py-2 font-bold">Rate</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              <tr className="border-b border-gray-200">
                <td className="py-2 pr-4">Discovery flight</td>
                <td className="py-2 font-semibold">$150</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 pr-4">Aircraft rental (Cheetah) — cash</td>
                <td className="py-2 font-semibold">$185/hr</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 pr-4">Aircraft rental (Cheetah) — card</td>
                <td className="py-2 font-semibold">$195/hr</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 pr-4">Flight instruction</td>
                <td className="py-2 font-semibold">$65/hr</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 pr-4">Online Ground School (full)</td>
                <td className="py-2 font-semibold">$800</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Online Ground School (weekly)</td>
                <td className="py-2 font-semibold">$215/wk × 4</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-3">
            Rates current as of May 2026. See <a href="https://merlinflighttraining.com/pricing" className="text-golden underline">merlinflighttraining.com/pricing</a> for the full breakdown.
          </p>
        </section>

        {/* Who flies with us */}
        <section className="brochure-section mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Who flies with us
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-gray-800 mb-3">
            Our students are mostly working adults — engineers, attorneys,
            healthcare workers, sales reps, teachers, business owners — who
            want to learn to fly without quitting their day job. Most live
            within 30 minutes of KPNE.
          </p>
          <p className="text-base sm:text-lg leading-relaxed text-gray-800">
            We serve the entire Philadelphia tri-state area: Center City,
            Northeast Philly, Bucks County, Montgomery County, South Jersey,
            and northern Delaware. KPNE is the most convenient general aviation
            airport for most of the metro.
          </p>
        </section>

        {/* The next step */}
        <section className="brochure-section mb-12 bg-black text-white p-6 sm:p-10 rounded-lg text-center">
          <p className="text-golden font-bold text-xs uppercase tracking-widest mb-3">
            The next step
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Book a discovery flight — $150
          </h2>
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed mb-6 max-w-2xl mx-auto">
            One flight tells you more than ten hours of reading. Pre-flight
            brief, you in the left seat, ~60 minutes airborne, full debrief.
            No commitment beyond.
          </p>
          <Link
            href="/discovery-flight-funnel"
            className="inline-block bg-golden text-black px-8 py-3 rounded-lg font-bold text-base hover:bg-yellow-500 transition-colors no-print"
          >
            Book your discovery flight →
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            Or visit <strong>merlinflighttraining.com/discovery-flight-funnel</strong>
          </p>
        </section>

        {/* Contact */}
        <section className="brochure-section text-center text-sm text-gray-600 pt-6 border-t border-gray-200">
          <p className="font-semibold text-black mb-1">Merlin Flight Training</p>
          <p>Northeast Philadelphia Airport · 9800 Ashton Rd · Philadelphia, PA 19114</p>
          <p className="mt-2">
            isaac@merlinflighttraining.com · <a href="https://merlinflighttraining.com" className="text-golden">merlinflighttraining.com</a>
          </p>
          <p className="mt-4 text-xs text-gray-500">
            Isaac Prestwich, CFII · Founder &amp; Chief Flight Instructor
          </p>
        </section>

      </div>
    </div>
  )
}
