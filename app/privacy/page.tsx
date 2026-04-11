import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | Merlin Flight Training",
  description:
    "Privacy Policy for Merlin Flight Training and our SMS text messaging program powered by Twilio. Learn how we collect, use, and protect your information.",
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
              This Privacy Policy describes how Merlin Flight Training (&ldquo;Merlin,&rdquo;
              &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) collects, uses, stores, and
              shares information about you when you visit merlinflighttraining.com (the
              &ldquo;Site&rdquo;), use any of our flight training or discovery flight services,
              contact us, or opt in to receive text messages from us. Our SMS text messaging
              program is powered by Twilio Inc. (&ldquo;Twilio&rdquo;). By using the Site or our
              services, you agree to the practices described in this Privacy Policy.
            </p>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">
                1. Information We Collect
              </h2>
              <p>
                We collect information you provide directly to us when you fill out a form on our
                Site (including the SMS opt-in, contact, discovery flight, and enrollment forms),
                create an account, schedule a lesson, make a payment, or otherwise communicate
                with us. This information may include:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Full name</li>
                <li>Email address</li>
                <li>Mobile telephone number</li>
                <li>Mailing address and emergency contact information</li>
                <li>Training preferences and pilot certificate information</li>
                <li>Payment information (processed by our third-party payment processor)</li>
                <li>
                  Records of your consent choices, including the date, time, IP address, and
                  consent language shown to you when you opted in to SMS messaging
                </li>
              </ul>
              <p className="mt-3">
                We also automatically collect limited technical information when you visit the
                Site, such as your IP address, browser type, device identifiers, referring pages,
                and pages viewed. This information is used to operate the Site, keep it secure,
                and improve its performance.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">
                2. How We Use Your Information
              </h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Provide and manage our flight training and discovery flight services.</li>
                <li>
                  Schedule lessons and notify you of schedule changes, weather cancellations, and
                  training updates.
                </li>
                <li>
                  Send transactional and account messages (such as receipts, reminders, and
                  program notices).
                </li>
                <li>
                  If you opt in, send SMS text messages for lesson reminders, schedule changes,
                  weather cancellations, training updates, and account notifications.
                </li>
                <li>Respond to your questions, requests, and support inquiries.</li>
                <li>
                  Detect, prevent, and address fraud, abuse, security incidents, and other
                  harmful activity.
                </li>
                <li>Comply with our legal and regulatory obligations.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">
                3. SMS Text Messaging Program &amp; Mobile Information
              </h2>
              <p>
                Merlin Flight Training operates an SMS text messaging program (the &ldquo;SMS
                Program&rdquo;) powered by Twilio, a communications platform provider. When you
                provide your mobile number and check the consent box on our opt-in form, you
                expressly consent to receive recurring text messages from Merlin Flight Training
                at the mobile number you provide.
              </p>

              <h3 className="text-lg font-semibold text-darkText mt-5 mb-2">
                What messages you may receive
              </h3>
              <p>
                Messages sent through the SMS Program may include lesson reminders, schedule
                changes, weather cancellations, training updates, and account notifications.
              </p>

              <h3 className="text-lg font-semibold text-darkText mt-5 mb-2">
                Message frequency, rates, and carriers
              </h3>
              <p>
                Message frequency varies based on your activity with the school. Message and
                data rates may apply according to your mobile carrier&rsquo;s plan. Carriers are
                not liable for delayed or undelivered messages. Supported carriers include, but
                are not limited to, AT&amp;T, T-Mobile, Verizon Wireless, Sprint, Boost, Cricket,
                MetroPCS, U.S. Cellular, and their affiliates.
              </p>

              <h3 className="text-lg font-semibold text-darkText mt-5 mb-2">
                How to opt out (STOP) and get help (HELP)
              </h3>
              <p>
                You can cancel the SMS Program at any time by texting{" "}
                <strong>STOP</strong> to any message you receive from us. After you send{" "}
                <strong>STOP</strong>, we will send you a confirmation message, and you will not
                receive any further messages unless you opt back in. If you need assistance,
                reply <strong>HELP</strong> to any of our messages, or contact us at{" "}
                <a
                  href="mailto:merlinflighttraining@gmail.com"
                  className="text-golden hover:underline"
                >
                  merlinflighttraining@gmail.com
                </a>{" "}
                or{" "}
                <a href="tel:+19294874717" className="text-golden hover:underline">
                  +1 (929) 487-4717
                </a>
                .
              </p>

              <h3 className="text-lg font-semibold text-darkText mt-5 mb-2">
                How we handle mobile information
              </h3>
              <p className="font-medium text-darkText">
                No mobile information will be shared with third parties or affiliates for
                marketing or promotional purposes. Information sharing to subcontractors in
                support of our services, such as customer support or message delivery, is
                permitted. All other use case categories exclude text messaging originator opt-in
                data and consent; this information will not be shared with any third parties.
              </p>
              <p className="mt-3">
                Specifically, your mobile phone number, SMS consent, and the contents of messages
                you exchange with us are used only to operate the SMS Program and deliver the
                services you requested. Mobile opt-in data and consent records are{" "}
                <strong>
                  never sold, rented, or shared with third parties or affiliates for their own
                  marketing or promotional purposes.
                </strong>
              </p>

              <h3 className="text-lg font-semibold text-darkText mt-5 mb-2">
                Twilio as our SMS provider
              </h3>
              <p>
                We use Twilio Inc. (&ldquo;Twilio&rdquo;) to send and receive text messages on our
                behalf. When you send or receive a message as part of the SMS Program, your
                mobile phone number and the content of the message are processed by Twilio as a
                service provider to Merlin Flight Training. Twilio is contractually required to
                use this information only to provide messaging services to us and is not
                permitted to use it for its own marketing purposes. Twilio&rsquo;s handling of
                this data is also governed by Twilio&rsquo;s own privacy notice, available at{" "}
                <a
                  href="https://www.twilio.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-golden hover:underline"
                >
                  https://www.twilio.com/legal/privacy
                </a>
                .
              </p>

              <h3 className="text-lg font-semibold text-darkText mt-5 mb-2">Consent is optional</h3>
              <p>
                Consent to receive marketing or informational SMS messages from Merlin Flight
                Training is <strong>not</strong> a condition of purchasing any goods or services.
                You may still use our Site and services without opting in to the SMS Program.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">
                4. How We Share Information
              </h2>
              <p>We share information only in the following limited circumstances:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>
                  <strong>Service providers.</strong> With trusted vendors that help us operate
                  the Site and deliver our services &mdash; for example, Twilio (SMS delivery),
                  our email service provider, our scheduling platform, our payment processor,
                  and our hosting provider. These vendors may only use your information to
                  perform services on our behalf and are bound by contractual confidentiality and
                  security obligations.
                </li>
                <li>
                  <strong>Legal and safety.</strong> When required by law, subpoena, or other
                  legal process, or to protect the rights, property, or safety of Merlin Flight
                  Training, our students, or others.
                </li>
                <li>
                  <strong>Business transfers.</strong> In connection with a merger, acquisition,
                  or sale of all or a portion of our assets, in which case your information may
                  be transferred to the successor entity, subject to this Privacy Policy.
                </li>
              </ul>
              <p className="mt-3 font-medium text-darkText">
                We do not sell your personal information, and we do not share mobile phone
                numbers or SMS consent with third parties or affiliates for marketing purposes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">5. Data Retention</h2>
              <p>
                We retain personal information for as long as needed to provide our services, to
                comply with our legal obligations (including recordkeeping required for SMS
                consent), to resolve disputes, and to enforce our agreements. When information is
                no longer needed, we will delete or anonymize it.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">6. Your Choices and Rights</h2>
              <p>
                You can update or correct the information in your account at any time by
                contacting us. You can unsubscribe from marketing emails by using the unsubscribe
                link in any email, and you can opt out of SMS messages at any time by replying{" "}
                <strong>STOP</strong>. Depending on where you live, you may have additional
                rights under applicable privacy laws, such as the right to access, correct, or
                delete the personal information we hold about you. To exercise these rights,
                please contact us at{" "}
                <a
                  href="mailto:merlinflighttraining@gmail.com"
                  className="text-golden hover:underline"
                >
                  merlinflighttraining@gmail.com
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">7. Data Security</h2>
              <p>
                We use reasonable administrative, technical, and physical safeguards to protect
                the information we collect. However, no method of transmission over the Internet
                or electronic storage is completely secure, and we cannot guarantee absolute
                security.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">
                8. Children&rsquo;s Privacy
              </h2>
              <p>
                Our Site and the SMS Program are not directed to children under 13, and we do not
                knowingly collect personal information from children under 13. If you believe we
                have collected information from a child under 13, please contact us and we will
                delete it. Students under the age of 18 must have a parent or legal guardian
                consent on their behalf before participating in our services or the SMS Program.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">
                9. Changes to This Privacy Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. When we do, we will revise
                the &ldquo;Last updated&rdquo; date at the top of this page. If the changes are
                material, we will provide additional notice (such as by email or a prominent
                notice on the Site) where required by law.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-darkText mb-3">10. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, our SMS Program, or our data
                practices, please contact us at:
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
