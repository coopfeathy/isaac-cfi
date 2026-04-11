import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service | Merlin Flight Training",
  description:
    "Terms of Service for Merlin Flight Training – the rules and conditions that govern your use of merlinflighttraining.com and our services.",
  robots: { index: true, follow: true },
}

export default function TermsOfServicePage() {
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
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-3 text-gray-400 font-light">Last updated {lastUpdated}</p>
          <div className="mt-6 h-px w-24 bg-gradient-to-r from-transparent via-golden to-transparent" />
        </div>
      </section>

      {/* Body */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <article className="prose prose-neutral max-w-none text-darkText font-light leading-relaxed space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">1. Acceptance of Terms</h2>
              <p>
                Welcome to Merlin Flight Training (&ldquo;Merlin,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). By
                accessing or using merlinflighttraining.com (the &ldquo;Site&rdquo;) or any of our flight
                training, discovery flight, scheduling, payment, or communication services, you
                agree to be bound by these Terms of Service (the &ldquo;Terms&rdquo;). If you do not agree
                to these Terms, please do not use the Site or our services.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">2. Flight Training Services</h2>
              <p>
                Merlin Flight Training provides FAA-certified flight instruction, discovery
                flights, and related educational services at Republic Airport (FRG) in
                Farmingdale, New York. All flight activities are subject to Federal Aviation
                Regulations, aircraft availability, weather conditions, and instructor judgment.
                Scheduling, cancellation, and no-show policies are provided to students during
                onboarding and may be updated from time to time.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">3. Accounts and Eligibility</h2>
              <p>
                Some features of the Site require an account. You agree to provide accurate,
                current, and complete information and to keep your credentials secure. You are
                responsible for all activity that occurs under your account. Students under the
                age of 18 must have a parent or legal guardian review and agree to these Terms on
                their behalf.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">4. SMS Text Messaging Program</h2>
              <p>
                If you opt in to our SMS program, you consent to receive text messages from
                Merlin Flight Training at the mobile number you provide. These messages may
                include lesson reminders, schedule changes, weather cancellations, training
                updates, and account notifications. Message and data rates may apply, and message
                frequency varies based on your activity with the school. You can opt out at any
                time by replying <strong>STOP</strong> to any message, or by contacting us
                directly at{" "}
                <a
                  href="mailto:merlinflighttraining@gmail.com"
                  className="text-golden hover:underline"
                >
                  merlinflighttraining@gmail.com
                </a>
                . For help, reply <strong>HELP</strong>. Consent to receive SMS messages is not a
                condition of purchasing any goods or services.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">5. Payments, Refunds, and Billing</h2>
              <p>
                Fees for flight training, discovery flights, rentals, and other services are
                described on the Site or in your student agreement. Payments are processed
                through secure third-party payment processors. Refund eligibility is determined
                by the specific program or service purchased and by our cancellation policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">6. Safety and Assumption of Risk</h2>
              <p>
                Aviation activities involve inherent risks. By participating in any flight
                training, discovery flight, or other aviation-related service, you acknowledge
                and voluntarily assume those risks. Before any flight, you may be required to
                sign additional waivers or releases.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">7. Intellectual Property</h2>
              <p>
                All content on the Site&mdash;including text, graphics, logos, images, curriculum
                materials, and software&mdash;is the property of Merlin Flight Training or its
                licensors and is protected by copyright, trademark, and other laws. You may not
                copy, reproduce, or distribute any content without our prior written permission.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">8. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, Merlin Flight Training shall not be
                liable for any indirect, incidental, consequential, special, or punitive damages
                arising out of or relating to your use of the Site or our services. Our total
                liability for any claim shall not exceed the amount you paid us for the specific
                service giving rise to the claim.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">9. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. When we do, we will revise the
                &ldquo;Last updated&rdquo; date at the top of this page. Your continued use of the
                Site after changes take effect constitutes your acceptance of the revised Terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">10. Contact Us</h2>
              <p>
                If you have questions about these Terms, please contact us at:
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
