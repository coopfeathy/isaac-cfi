import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | Merlin Flight Training",
  description:
    "Privacy Policy for Merlin Flight Training – how we collect, use, and protect your information when you use merlinflighttraining.com.",
  robots: { index: true, follow: true },
}

export default function PrivacyPolicyPage() {
  const lastUpdated = "April 10, 2026"

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="relative bg-black text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z' fill='%23FFBF00' fill-opacity='0.25'/%3E%3C/svg%3E")`,
              backgroundSize: "80px 80px",
            }}
          />
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 max-w-4xl">
          <Link
            href="/"
            className="text-golden hover:text-white transition-colors duration-300 text-sm font-light inline-flex items-center gap-1"
          >
            <span aria-hidden="true">&larr;</span> Back to home
          </Link>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-3 text-gray-400 font-light">Last updated {lastUpdated}</p>
          <div className="mt-6 h-px w-24 bg-gradient-to-r from-transparent via-golden to-transparent" />
        </div>
      </section>

      {/* Body */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <article className="text-darkText font-light leading-relaxed space-y-8">
            <p>
              Merlin Flight Training (&ldquo;Merlin,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) respects your
              privacy. This Privacy Policy describes the types of information we collect through
              merlinflighttraining.com (the &ldquo;Site&rdquo;) and our services, how we use and share it,
              and the choices you have.
            </p>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us when you fill out a form on our
                Site (such as the SMS opt-in, contact, discovery flight, or enrollment forms),
                create an account, schedule a lesson, make a payment, or communicate with us.
                This may include your name, email address, mobile phone number, mailing address,
                training preferences, and any other details you choose to share.
              </p>
              <p className="mt-3">
                We also automatically collect limited technical information when you visit the
                Site, such as your IP address, browser type, device information, and pages
                viewed, to keep the Site secure and improve how it works.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Provide and manage our flight training and discovery flight services.</li>
                <li>
                  Schedule lessons and notify you of schedule changes, weather cancellations, and
                  training updates.
                </li>
                <li>
                  Send you account and transactional messages (for example, receipts, reminders,
                  and program notices).
                </li>
                <li>
                  If you opt in, send SMS text messages for lesson reminders, schedule changes,
                  weather cancellations, training updates, and account notifications.
                </li>
                <li>Respond to your questions and support requests.</li>
                <li>Comply with legal obligations and protect our rights.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">3. SMS Messaging and Mobile Information</h2>
              <p>
                We collect mobile phone numbers only from people who voluntarily provide them.
                When you opt in to our SMS program, you agree to receive text messages from
                Merlin Flight Training at the number you provided. Message and data rates may
                apply, and message frequency varies based on your activity with the school.
              </p>
              <p className="mt-3">
                <strong>
                  We do not sell, rent, or share mobile phone numbers or SMS consent information
                  with third parties or affiliates for their own marketing purposes.
                </strong>{" "}
                Mobile information shared with SMS service providers is used solely to deliver
                our messages and is not shared with any other third parties for marketing.
              </p>
              <p className="mt-3">
                You can opt out at any time by replying <strong>STOP</strong> to any text
                message, or by contacting us at{" "}
                <a
                  href="mailto:merlinflighttraining@gmail.com"
                  className="text-golden hover:underline"
                >
                  merlinflighttraining@gmail.com
                </a>
                . Reply <strong>HELP</strong> for help.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">4. How We Share Information</h2>
              <p>
                We share information only with trusted service providers that help us operate
                the Site and our services &ndash; for example, email delivery, SMS delivery,
                scheduling, payment processing, and hosting providers. These providers may only
                use your information to perform services on our behalf.
              </p>
              <p className="mt-3">
                We may also disclose information when required by law, to enforce our Terms of
                Service, or to protect the rights, property, or safety of Merlin Flight Training,
                our students, or others.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">5. Your Choices</h2>
              <p>
                You may update or correct the information in your account at any time by
                contacting us. You can unsubscribe from marketing emails by using the unsubscribe
                link in any email, and you can opt out of SMS messages at any time by replying
                <strong> STOP</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">6. Data Security</h2>
              <p>
                We use reasonable administrative, technical, and physical safeguards to protect
                the information we collect. However, no method of transmission over the Internet
                or electronic storage is completely secure, and we cannot guarantee absolute
                security.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">7. Children&rsquo;s Privacy</h2>
              <p>
                Our Site is not directed to children under 13, and we do not knowingly collect
                personal information from children under 13. If you believe we have collected
                information from a child under 13, please contact us and we will delete it.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">8. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. When we do, we will revise
                the &ldquo;Last updated&rdquo; date at the top of this page.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">9. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, please
                contact us at:
              </p>
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                <p className="font-semibold text-darkText">Merlin Flight Training</p>
                <p>208 NY-109, Farmingdale, NY 11735</p>
                <p>
                  <a
                    href="mailto:merlinflighttraining@gmail.com"
                    className="text-golden hover:underline"
                  >
                    merlinflighttraining@gmail.com
                  </a>
                </p>
                <p>
                  <a href="tel:+19294874717" className="text-golden hover:underline">
                    +1 (929) 487-4717
                  </a>
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
