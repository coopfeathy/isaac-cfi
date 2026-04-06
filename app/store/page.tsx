import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Pilot Store | Merlin Flight Training - Starter Packages & Gear",
  description:
    "Everything you need to start flight training. Browse curated starter packages, branded Merlin merch, and recommended aviation gear with exclusive student savings.",
  openGraph: {
    title: "Pilot Store | Merlin Flight Training",
    description:
      "Curated starter packages, branded merch, and recommended aviation gear for student pilots.",
    url: "https://merlinflight.com/store",
  },
}

const cadetItems = [
  "Custom Merlin flight bag",
  "Pilot logbook",
  "ASA E6B flight computer",
  "ASA plotter",
  "Kneeboard with clipboard",
  "FAR/AIM book (current year)",
  "Fuel tester + checklist card",
  "Merlin t-shirt & hat",
  "Merlin patch + sticker pack",
  "Welcome training roadmap",
]

const aviatorExtras = [
  "Everything in Cadet",
  "Sporty\u2019s Private Pilot course (online)",
  "ASA Oral Exam Guide",
  "iPad mount (yoke/kneeboard)",
  "Aviation sunglasses",
  "Merlin branded hoodie",
  "Portable handheld radio",
]

const captainExtras = [
  "Everything in Aviator",
  "Aviation headset (choose your tier)",
  "ForeFlight 1-year subscription",
]

const captainOptions = [
  { label: "Faro G2 ANR", price: "$1,549" },
  { label: "David Clark H10-13.4", price: "$1,649" },
  { label: "David Clark ONE-X", price: "$2,049" },
  { label: "Bose A30", price: "$2,449" },
]

const merchItems = [
  {
    name: "Merlin T-Shirt",
    price: "$28",
    description: "Classic black tee with gold Merlin logo",
  },
  {
    name: "Merlin Hoodie",
    price: "$55",
    description: "Premium heavyweight hoodie, embroidered logo",
  },
  {
    name: "Merlin Hat",
    price: "$25",
    description: "Structured snapback, gold embroidered",
  },
  {
    name: "Merlin Patch",
    price: "$12",
    description: "Iron-on embroidered patch, 3-inch",
  },
  {
    name: "Merlin Sticker Pack",
    price: "$8",
    description: "5-pack of aviation stickers",
  },
  {
    name: "Merlin Flight Bag",
    price: "$45",
    description: "Custom pilot bag with Merlin branding",
  },
]

const headsets = [
  {
    name: "Bose A30",
    price: "~$1,299",
    description: "Best-in-class ANR noise cancellation, Bluetooth, lightweight design",
    href: "https://amzn.to/4td1tEN",
    image: "https://m.media-amazon.com/images/I/71F3iowq-qL._AC_SX679_.jpg",
  },
  {
    name: "David Clark H10-13.4",
    price: "~$350",
    description: "Industry-standard PNR headset, legendary durability",
    href: "https://amzn.to/4bSpTwX",
    image: "https://m.media-amazon.com/images/I/51urPwwZ3OL._AC_SX679_.jpg",
  },
  {
    name: "Lightspeed Sierra ANR",
    price: "~$749",
    description: "Premium ANR with Bluetooth, great comfort-to-price ratio",
    href: "https://amzn.to/4sT9myN",
    image: "https://m.media-amazon.com/images/I/71Lw89xptxL._AC_SY879_.jpg",
  },
  {
    name: "Lightspeed Zulu 3",
    price: "~$899",
    description: "Top-tier ANR headset with Bluetooth and plush ear seals",
    href: "https://amzn.to/4tpncZC",
    image: "https://m.media-amazon.com/images/I/51uQiklng4L._AC_SX679_.jpg",
  },
]

const technology = [
  {
    name: "iPad Mini (A17 Pro)",
    price: "~$499",
    description: "Compact and powerful — perfect cockpit size for ForeFlight",
    href: "https://amzn.to/48tl9eS",
    image: "https://m.media-amazon.com/images/I/61-Gx4p9rEL._AC_SX679_.jpg",
  },
  {
    name: "Apple iPad 11-inch",
    price: "~$349",
    description: "Great entry-level iPad for ForeFlight navigation",
    href: "https://amzn.to/4tpabiB",
    image: "https://m.media-amazon.com/images/I/61+zr8PjwaL._AC_SX679_.jpg",
  },
  {
    name: "iPad Air 11-inch (M4) Cellular",
    price: "~$709",
    description: "M4 chip with 5G — stay connected everywhere",
    href: "https://amzn.to/41bED3X",
    image: "https://m.media-amazon.com/images/I/71iBSe04h+L._AC_SX679_.jpg",
  },
  {
    name: "iPad Air 13-inch (M4)",
    price: "~$749",
    description: "Large display for detailed chart viewing and flight planning",
    href: "https://amzn.to/4cdiTcV",
    image: "https://m.media-amazon.com/images/I/71DU8xyt5mL._AC_SX679_.jpg",
  },
  {
    name: "iPad Air 13-inch (M4) Cellular",
    price: "~$938",
    description: "Full-size display with 5G for maximum flexibility",
    href: "https://amzn.to/48hmZiZ",
    image: "https://m.media-amazon.com/images/I/71Lvw39irML._AC_SX679_.jpg",
  },
  {
    name: "RAM iPad Yoke Mount",
    price: "~$50",
    description: "Secure yoke mount — keeps your iPad in view while flying",
    href: "https://amzn.to/4va2T44",
    image: "https://m.media-amazon.com/images/I/714Sz4qoHBL._AC_SX679_.jpg",
  },
]

const trainingMaterials = [
  {
    name: "FAR/AIM 2026",
    price: "~$25",
    description: "FAA regulations and aeronautical information — updated annually",
    href: "https://amzn.to/4c40wXJ",
    image: "https://m.media-amazon.com/images/I/71t4f8CVuyL._SY522_.jpg",
  },
  {
    name: "Pilot\u2019s Handbook (PHAK)",
    price: "~$20",
    description: "FAA-H-8083-25C — the foundational knowledge book for all pilots",
    href: "https://amzn.to/47I36Bs",
    image: "https://m.media-amazon.com/images/I/712D8Zf6MML._SY522_.jpg",
  },
  {
    name: "Airplane Flying Handbook",
    price: "~$20",
    description: "FAA-H-8083-3C — maneuvers, procedures, and flight techniques",
    href: "https://amzn.to/4dOVh0T",
    image: "https://m.media-amazon.com/images/I/71hX7zrFP0L._SY522_.jpg",
  },
  {
    name: "Private Pilot ACS",
    price: "~$15",
    description: "Airman Certification Standards — know exactly what the examiner expects",
    href: "https://amzn.to/3NX5RZ3",
    image: "https://m.media-amazon.com/images/I/618ZUtsGO1L._SY522_.jpg",
  },
  {
    name: "Flight Bag",
    price: "~$45",
    description: "Wairworthy Ascend — purpose-built pilot bag with smart organization",
    href: "https://amzn.to/3NX5Jsx",
    image: "https://m.media-amazon.com/images/I/71MQGU5gHJL._AC_SX679_.jpg",
  },
  {
    name: "Pilot Kneeboard",
    price: "~$25",
    description: "Essential for in-flight notes, checklists, and approach plates",
    href: "https://amzn.to/3O2xW16",
    image: "https://m.media-amazon.com/images/I/71EmDUDpBJL._AC_SX679_.jpg",
  },
]

const studyAids = [
  {
    name: "Private Pilot Test Prep 2025–2026",
    price: "~$20",
    description: "Practice questions and explanations for the FAA written exam",
    href: "https://amzn.to/4vdVQrc",
    image: "https://m.media-amazon.com/images/I/71bTQwi-znL._SY522_.jpg",
  },
  {
    name: "Private Pilot Flash Cards",
    price: "~$20",
    description: "Quick-review cards covering all major knowledge areas",
    href: "https://amzn.to/4c9LWOs",
    image: "https://m.media-amazon.com/images/I/814H1MUgcmL._AC_SX679_.jpg",
  },
  {
    name: "ASA E6B Flight Computer",
    price: "~$12",
    description: "Manual flight computer — required for training and the checkride",
    href: "https://amzn.to/41h7zra",
    image: "https://m.media-amazon.com/images/I/71hJSq9fwCL._AC_SX679_.jpg",
  },
  {
    name: "Aviation Plotter",
    price: "~$12",
    description: "Navigation plotter for cross-country flight planning on charts",
    href: "https://amzn.to/4vsvYYO",
    image: "https://m.media-amazon.com/images/I/61ZWqLT3j3L._SX522_.jpg",
  },
]

function mailtoLink(tier: string) {
  const subject = encodeURIComponent(`Starter Package Inquiry - ${tier}`)
  const body = encodeURIComponent(
    `Hi! I'm interested in the ${tier} Starter Package. Please let me know how to get started!`
  )
  return `mailto:merlinflighttraining@gmail.com?subject=${subject}&body=${body}`
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <span className="text-golden mt-0.5 shrink-0">✓</span>
      <span>{children}</span>
    </li>
  )
}

function GearCard({
  name,
  price,
  description,
  href = "#",
  image,
}: {
  name: string
  price: string
  description: string
  href?: string
  image?: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-golden/40 hover:shadow-md transition-all duration-300 overflow-hidden">
      {image && (
        <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
          <img
            src={image}
            alt={name}
            className="object-contain w-full h-full"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-black text-sm">{name}</h4>
          <span className="text-golden font-bold text-sm whitespace-nowrap ml-3">
            {price}
          </span>
        </div>
        <p className="text-gray-600 text-sm font-light mb-4">{description}</p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-golden text-sm font-medium hover:underline"
          aria-label={`View deal for ${name}`}
        >
          View Deal →
        </a>
      </div>
    </div>
  )
}

export default function StorePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
              backgroundSize: "100px 100px",
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-golden text-xs sm:text-sm font-semibold tracking-widest mb-4">
            ✈ MERLIN FLIGHT TRAINING
          </p>
          <div className="mb-4 inline-block">
            <div className="w-16 sm:w-20 h-1 bg-golden mx-auto rounded-full" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Pilot{" "}
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Store
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
            Everything you need to start your aviation journey — curated starter
            packages, branded Merlin gear, and recommended equipment.
          </p>
        </div>
      </section>

      {/* Starter Packages Section */}
      <section id="packages" className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 tracking-tight">
              Starter Packages
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
              Everything you need in one box. Choose your tier and walk in ready
              to fly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* CADET Card */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Best Value
                  </span>
                  <span className="text-2xl" aria-hidden="true">
                    🎒
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-black mb-1">
                  CADET Package
                </h3>
                <p className="text-3xl font-bold text-golden mb-2">$249</p>
                <p className="text-gray-600 text-sm font-light mb-6">
                  The essentials to get started
                </p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {cadetItems.map((item) => (
                    <CheckItem key={item}>{item}</CheckItem>
                  ))}
                </ul>
                <a
                  href={mailtoLink("Cadet")}
                  className="block w-full text-center bg-black text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors duration-200"
                  aria-label="Get started with the Cadet Starter Package"
                >
                  Get Started
                </a>
              </div>
            </div>

            {/* AVIATOR Card — emphasized */}
            <div className="bg-white rounded-3xl shadow-xl border-2 border-golden overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col md:scale-105 relative">
              <div className="bg-gradient-to-r from-golden via-yellow-400 to-golden py-2 text-center">
                <span className="text-black text-xs font-bold uppercase tracking-widest">
                  Most Popular
                </span>
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-golden/10 text-golden text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </span>
                  <span className="text-2xl" aria-hidden="true">
                    ✈️
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-black mb-1">
                  AVIATOR Package
                </h3>
                <p className="text-3xl font-bold text-golden mb-2">$749</p>
                <p className="text-gray-600 text-sm font-light mb-6">
                  Complete training kit — just add a headset
                </p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {aviatorExtras.map((item) => (
                    <CheckItem key={item}>{item}</CheckItem>
                  ))}
                </ul>
                <a
                  href={mailtoLink("Aviator")}
                  className="block w-full text-center bg-golden text-black font-semibold py-3 px-6 rounded-xl hover:bg-yellow-500 transition-colors duration-200"
                  aria-label="Get started with the Aviator Starter Package"
                >
                  Most Popular
                </a>
              </div>
            </div>

            {/* CAPTAIN'S Card */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    All-Inclusive
                  </span>
                  <span className="text-2xl" aria-hidden="true">
                    🏆
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-black mb-1">
                  CAPTAIN&apos;S Package
                </h3>
                <p className="text-3xl font-bold text-golden mb-2">
                  From $1,549
                </p>
                <p className="text-gray-600 text-sm font-light mb-6">
                  Walk in ready to fly. Includes headset.
                </p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {captainExtras.map((item) => (
                    <CheckItem key={item}>{item}</CheckItem>
                  ))}
                </ul>
                <div className="mb-6 bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Headset Options
                  </p>
                  <ul className="space-y-2">
                    {captainOptions.map((opt) => (
                      <li
                        key={opt.label}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-gray-700">{opt.label}</span>
                        <span className="font-semibold text-black">
                          {opt.price}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a
                  href={mailtoLink("Captain's")}
                  className="block w-full text-center bg-black text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors duration-200"
                  aria-label="Build your Captain's Starter Package kit"
                >
                  Build Your Kit
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Merlin Merch Section */}
      <section id="merch" className="py-16 sm:py-20 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 tracking-tight">
              Merlin Gear
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
              Rep your flight school. All merch is made-to-order and ships
              directly to you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {merchItems.map((item) => (
              <div
                key={item.name}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
              >
                <div className="bg-gray-200 h-48 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <svg
                      className="w-10 h-10 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    <p className="text-sm font-medium">Coming Soon</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-black">{item.name}</h3>
                    <span className="text-golden font-bold">{item.price}</span>
                  </div>
                  <p className="text-gray-600 text-sm font-light mb-4">
                    {item.description}
                  </p>
                  <button
                    disabled
                    className="w-full text-center bg-gray-100 text-gray-400 font-medium py-2.5 px-4 rounded-xl cursor-not-allowed text-sm"
                    aria-label={`${item.name} — coming soon`}
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-10 font-light">
            Merch store launching soon!{" "}
            <a
              href="mailto:merlinflighttraining@gmail.com?subject=Merch Store Updates"
              className="text-golden hover:underline font-medium"
            >
              Sign up for updates
            </a>
            .
          </p>
        </div>
      </section>

      {/* Recommended Gear Section */}
      <section id="gear" className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 tracking-tight">
              Recommended Gear
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
              Hand-picked by your instructor. These are the tools we trust and
              use every day.
            </p>
            <p className="text-sm text-gray-400 italic mt-3">
              Some links may earn us a small commission at no extra cost to you.
            </p>
          </div>

          {/* Headsets */}
          <div className="mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-black mb-6">
              Headsets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {headsets.map((item) => (
                <GearCard key={item.name} {...item} />
              ))}
            </div>
          </div>

          {/* Technology */}
          <div className="mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-black mb-6">
              Technology
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {technology.map((item) => (
                <GearCard key={item.name} {...item} />
              ))}
            </div>
          </div>

          {/* Training Materials */}
          <div className="mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-black mb-6">
              Training Materials
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {trainingMaterials.map((item) => (
                <GearCard key={item.name} {...item} />
              ))}
            </div>
          </div>

          {/* Study Aids */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-black mb-6">
              Study Aids
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {studyAids.map((item) => (
                <GearCard key={item.name} {...item} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-black relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23C59A2A' fill-opacity='0.1'/%3E%3C/svg%3E")`,
              backgroundSize: "100px 100px",
            }}
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-block mb-4">
            <div className="w-12 sm:w-16 h-1 bg-golden rounded-full" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Ready to Start Flying?
          </h2>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto font-light leading-relaxed mb-8">
            Get everything you need with a Merlin Starter Package, or book your
            first discovery flight.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#packages"
              className="inline-flex items-center justify-center bg-golden text-black font-semibold py-3 px-8 rounded-xl hover:bg-yellow-500 transition-colors duration-200"
              aria-label="Scroll up to view starter packages"
            >
              View Packages ↑
            </a>
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center bg-white/10 text-white font-semibold py-3 px-8 rounded-xl border border-white/20 hover:bg-white/20 transition-colors duration-200"
              aria-label="Book a discovery flight"
            >
              Book a Discovery Flight →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
