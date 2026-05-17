import Link from "next/link"

// Dedicated landing page targeting the literal keyword "Philadelphia flight
// school." Distinct from the homepage so it can be tightly optimized for one
// search intent: "I'm in the Philly area, where do I learn to fly?"
//
// SEO strategy:
//   - H1 is the exact-match query
//   - Each H2 maps to a sub-intent ("where", "what aircraft", "what programs",
//     "discovery flight", "where do students come from", "FAQs")
//   - Internal links to /aircraft, /training-options, /discovery-flight,
//     /pricing reinforce site topology
//   - FAQPage + BreadcrumbList JSON-LD lives in this folder's layout.tsx

const driveTimesToKPNE: Array<{ from: string; minutes: string }> = [
  { from: "Center City Philadelphia", minutes: "~25 min" },
  { from: "Bensalem / Trevose",        minutes: "~10 min" },
  { from: "Northeast Philly neighborhoods", minutes: "~10 min" },
  { from: "Doylestown",                 minutes: "~35 min" },
  { from: "King of Prussia",            minutes: "~30 min" },
  { from: "Cherry Hill, NJ",            minutes: "~30 min" },
  { from: "Mt. Laurel, NJ",             minutes: "~40 min" },
  { from: "Wilmington, DE",             minutes: "~50 min" },
]

const serviceArea: string[] = [
  "Center City Philadelphia",
  "Northeast Philadelphia",
  "South Philadelphia",
  "Bucks County (Doylestown, Newtown, Yardley, Bensalem)",
  "Montgomery County (King of Prussia, Norristown, Plymouth Meeting, Lansdale)",
  "Delaware County (Media, Springfield)",
  "Burlington County, NJ (Mt. Laurel, Moorestown)",
  "Camden County, NJ (Cherry Hill, Voorhees)",
  "New Castle County, DE (Wilmington)",
]

export default function PhiladelphiaFlightSchoolPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative py-16 sm:py-20 md:py-24 bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E\")",
              backgroundSize: "100px 100px",
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-golden font-semibold text-sm sm:text-base uppercase tracking-widest mb-4">
            Philadelphia Flight School · KPNE
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            The Philadelphia Metro&apos;s Home for{" "}
            <span className="text-golden">1-on-1 Flight Training</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light mb-8">
            Merlin Flight Training is an FAA-certified Part 61 flight school
            based at <strong className="text-white">Northeast Philadelphia
            Airport (KPNE)</strong> — 9800 Ashton Rd, Philadelphia, PA 19114.
            We train pilots one-on-one in a Grumman Cheetah AA-5A. No big
            classes. No waiting in line for an instructor. No surprises in
            pricing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/discovery-flight-funnel"
              className="inline-block bg-golden text-black px-8 py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-yellow-500 transition-colors"
            >
              Book a Discovery Flight — $150
            </Link>
            <Link
              href="/training-options"
              className="inline-block border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-white hover:text-black transition-colors"
            >
              See Training Programs →
            </Link>
          </div>
        </div>
      </section>

      {/* WHERE WE FLY FROM */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-golden font-semibold text-sm uppercase tracking-widest mb-2">
            01 · Where we fly from
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-4">
            Northeast Philadelphia Airport — the closest public airport to Center City
          </h2>
          <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-8 max-w-3xl">
            KPNE (also tagged ICAO &quot;KPNE&quot; / IATA &quot;PNE&quot;) is
            a fully-public general aviation airport in Northeast Philadelphia.
            It&apos;s a normal airport with free on-field parking — you drive
            in, walk over to the ramp, and we go fly. No security lines. No
            ticket counter.
          </p>

          <h3 className="text-xl sm:text-2xl font-bold text-black mb-4">
            Drive times to KPNE
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {driveTimesToKPNE.map((row) => (
              <div
                key={row.from}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
              >
                <span className="text-gray-800 font-medium text-sm sm:text-base">
                  {row.from}
                </span>
                <span className="text-golden font-semibold text-sm sm:text-base">
                  {row.minutes}
                </span>
              </div>
            ))}
          </div>

          <a
            href="https://maps.google.com/?q=Northeast+Philadelphia+Airport+KPNE+9800+Ashton+Rd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-black font-semibold border-b-2 border-golden hover:text-golden transition-colors"
          >
            Open in Google Maps →
          </a>
        </div>
      </section>

      {/* AIRCRAFT */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-golden font-semibold text-sm uppercase tracking-widest mb-2">
            02 · The aircraft
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-4">
            Grumman Cheetah AA-5A
          </h2>
          <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-6 max-w-3xl">
            Most flight schools in the Philadelphia area fly Cessna 172s. We
            picked the Cheetah on purpose — it&apos;s sportier, faster, and it
            teaches you to fly the airplane rather than fly past your mistakes.
            It&apos;s a forgiving trainer that builds real airmanship.
          </p>
          <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-8 max-w-3xl">
            Our N9725U is well-maintained, IFR-equipped, and flown weekly so
            it&apos;s never on the &quot;squawk and pray&quot; plan. Maintenance
            is logged transparently. If something breaks, we fix it.
          </p>
          <Link
            href="/aircraft"
            className="inline-block bg-black text-white px-6 py-3 rounded-lg font-semibold text-base hover:bg-gray-900 transition-colors"
          >
            See the aircraft →
          </Link>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-golden font-semibold text-sm uppercase tracking-widest mb-2">
            03 · What you can train for
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-8">
            Three certificate tracks. One instructor. Real progress every flight.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Private Pilot",
                description:
                  "The certificate that makes you a pilot. ~50–70 hours in the airplane, ground school in parallel, FAA written exam, and a checkride with a designated examiner. Most students at Merlin finish in 6–12 months while working a day job.",
                href: "/training-options",
              },
              {
                title: "Instrument Rating",
                description:
                  "After your PPL. Add flying in clouds and low visibility to your toolkit. ~50 hours of instrument training, instrument written, and an IR checkride. Unlocks the ability to keep flying when the weather isn't VFR.",
                href: "/training-options",
              },
              {
                title: "Commercial Pilot",
                description:
                  "The certificate that lets you get paid to fly. ~120 hours of flight time including specific maneuvers and cross-country experience. The on-ramp to a paid aviation career.",
                href: "/training-options",
              },
            ].map((program) => (
              <div
                key={program.title}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-golden hover:shadow-lg transition-all"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-3">
                  {program.title}
                </h3>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-4">
                  {program.description}
                </p>
                <Link
                  href={program.href}
                  className="text-golden font-semibold hover:underline"
                >
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DISCOVERY FLIGHT */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-golden font-semibold text-sm uppercase tracking-widest mb-3">
            04 · Start with a discovery flight
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
            $150 for your first flight in a real airplane
          </h2>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto mb-8 font-light">
            We&apos;ll do a pre-flight brief, you&apos;ll sit in the left seat,
            and we&apos;ll take off from KPNE and fly over Center City
            Philadelphia and the Delaware River. You&apos;ll fly the airplane
            — climb, descend, turn, level off. Land back at KPNE. Full
            post-flight debrief. No prior experience needed.
          </p>
          <Link
            href="/discovery-flight-funnel"
            className="inline-block bg-golden text-black px-8 py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-yellow-500 transition-colors"
          >
            Book your discovery flight →
          </Link>
        </div>
      </section>

      {/* SERVICE AREA */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-golden font-semibold text-sm uppercase tracking-widest mb-2">
            05 · Where our students come from
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-6">
            Serving the Philadelphia tri-state area
          </h2>
          <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-8 max-w-3xl">
            KPNE is the most convenient general-aviation airport for most of
            the Philadelphia metro. Students drive in from across the region:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {serviceArea.map((area) => (
              <div
                key={area}
                className="flex items-start gap-2 text-gray-700 text-sm sm:text-base"
              >
                <span className="text-golden font-bold">✓</span>
                <span>{area}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm leading-relaxed max-w-3xl">
            <strong>Nearby alternatives:</strong> some students drive past
            Wings Field (KLOM), Doylestown Airport (KDYL), or Brandywine
            Airport (KOQN) to fly at KPNE because of the runway length, fewer
            traffic patterns, and the 1-on-1 model. If you&apos;re comparing
            schools, reach out — we&apos;ll be straight with you about which
            field makes sense for where you live.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-golden font-semibold text-sm uppercase tracking-widest mb-2">
            06 · Common questions
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-8">
            What people ask before their first lesson
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Where is the closest flight school to Philadelphia?",
                a: "Merlin Flight Training operates out of Northeast Philadelphia Airport (KPNE) — the closest fully-public general aviation airport to Center City. About 25 minutes from City Hall, 15 minutes from Bensalem, 30 minutes from Cherry Hill or King of Prussia, and 35 minutes from Doylestown.",
              },
              {
                q: "How much does it cost to get a Private Pilot License in Philadelphia?",
                a: "A full Private Pilot Certificate at Merlin typically costs $13,000–$14,000, including aircraft rental, instruction, equipment, written exam, and the checkride. See the pricing page for the detailed breakdown.",
              },
              {
                q: "How long does it take to get a pilot license?",
                a: "FAA Part 61 requires 40 flight hours minimum, but most students take 50–70 hours over 6–12 months while balancing a day job. Students who fly twice a week typically finish in 6 months; once-a-week students take 10–12 months.",
              },
              {
                q: "Do you offer flight training in Bucks County or Montgomery County?",
                a: "Yes. Our home base is KPNE, but most students drive in from Bucks County (Doylestown, Newtown, Yardley), Montgomery County (King of Prussia, Norristown), and South Jersey (Cherry Hill, Mt. Laurel).",
              },
              {
                q: "What's a discovery flight and how much does it cost at KPNE?",
                a: "A discovery flight is your first time at the controls — you sit in the left seat, take off with the instructor, fly over Center City Philadelphia and the Delaware River, and land at KPNE. $150 and includes the pre-flight brief and post-flight debrief. No prior experience needed.",
              },
              {
                q: "Do I need to fly to KPNE? Can I drive?",
                a: "You drive. Northeast Philadelphia Airport (KPNE) is a normal public airport with free parking on the field. The airport address is 9800 Ashton Rd, Philadelphia, PA 19114.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-5 group"
              >
                <summary className="cursor-pointer font-semibold text-black text-base sm:text-lg list-none flex items-start justify-between gap-4">
                  <span>{item.q}</span>
                  <span className="text-golden text-xl group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed mt-4">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 sm:py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
            Ready to fly?
          </h2>
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 font-light">
            One discovery flight tells you more than ten hours of YouTube
            videos. Book yours — and if it&apos;s not for you, no pressure.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/discovery-flight-funnel"
              className="inline-block bg-golden text-black px-8 py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-yellow-500 transition-colors"
            >
              Book Discovery Flight — $150
            </Link>
            <Link
              href="/pricing"
              className="inline-block border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-white hover:text-black transition-colors"
            >
              See all pricing →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
