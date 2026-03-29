"use client"

import { useEffect, useMemo, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type BillingStudent = {
  id: string
  userId: string | null
  fullName: string
  email: string | null
  phone: string | null
  preferredCurrency: string
  trainingItemIds: string[]
  stripeCustomerId: string | null
  stripeInvoiceBalanceCents: number
  stripeBalanceCurrency: string
}

type BillingItem = {
  id: string
  name: string
  description: string | null
  type: string
  rate_cents: number | null
  is_active: boolean
}

type CheckoutLine = {
  itemId: string
  quantity: number
}

type CheckoutTotals = {
  subtotalCents: number
  processingFeeCents: number
  totalCents: number
  currency: string
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((cents || 0) / 100)
}

function CheckoutPaymentForm({
  totalCents,
  currency,
  onSuccess,
}: {
  totalCents: number
  currency: string
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setMessage("")

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    })

    if (error) {
      setMessage(error.message || "Payment failed")
    } else if (paymentIntent?.status === "succeeded") {
      setMessage("Payment succeeded")
      onSuccess()
    } else {
      setMessage("Payment submitted. Stripe may still be processing this payment method.")
    }

    setProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <button
        type="submit"
        disabled={processing || !stripe || !elements}
        className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {processing ? "Processing..." : `Charge ${formatMoney(totalCents, currency)}`}
      </button>
    </form>
  )
}

export default function AdminBillingPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [students, setStudents] = useState<BillingStudent[]>([])
  const [items, setItems] = useState<BillingItem[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [currency, setCurrency] = useState("usd")
  const [checkoutLines, setCheckoutLines] = useState<CheckoutLine[]>([{ itemId: "", quantity: 1 }])
  const [note, setNote] = useState("")

  const [stripeConfigured, setStripeConfigured] = useState(true)
  const [statusMessage, setStatusMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [creatingCheckout, setCreatingCheckout] = useState(false)
  const [pushingCheckout, setPushingCheckout] = useState<"email" | "text" | "copy" | null>(null)
  const [sendingAccountantText, setSendingAccountantText] = useState(false)

  const [clientSecret, setClientSecret] = useState("")
  const [checkoutTotals, setCheckoutTotals] = useState<CheckoutTotals | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      router.push("/login")
      return
    }

    void loadData()
  }, [authLoading, isAdmin, router])

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [students, selectedStudentId]
  )

  useEffect(() => {
    if (!selectedStudent) return

    setCurrency((selectedStudent.preferredCurrency || "usd").toLowerCase())

    if (selectedStudent.trainingItemIds.length > 0) {
      setCheckoutLines(
        selectedStudent.trainingItemIds.map((itemId) => ({
          itemId,
          quantity: 1,
        }))
      )
    }
  }, [selectedStudent])

  const totals = useMemo(() => {
    const lineTotal = checkoutLines.reduce((sum, line) => {
      const item = items.find((entry) => entry.id === line.itemId)
      if (!item || typeof item.rate_cents !== "number" || line.quantity <= 0) return sum
      return sum + item.rate_cents * line.quantity
    }, 0)

    const processingFeeCents = Math.round(lineTotal * 0.035)
    return {
      subtotalCents: lineTotal,
      processingFeeCents,
      totalCents: lineTotal + processingFeeCents,
    }
  }, [checkoutLines, items])

  async function loadData() {
    setLoading(true)
    setStatusMessage("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch("/api/admin/billing/overview", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to load billing data")

      setStudents(result.students || [])
      setItems(result.items || [])
      setStripeConfigured(Boolean(result.stripeConfigured))

      if (!selectedStudentId && result.students?.length) {
        setSelectedStudentId(result.students[0].id)
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load billing data")
    } finally {
      setLoading(false)
    }
  }

  const createCheckout = async () => {
    if (!selectedStudentId) {
      setStatusMessage("Select a student first")
      return
    }

    const validLines = checkoutLines.filter((line) => line.itemId && line.quantity > 0)
    if (validLines.length === 0) {
      setStatusMessage("Add at least one training item")
      return
    }

    setCreatingCheckout(true)
    setStatusMessage("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch("/api/admin/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          currency,
          note,
          itemSelections: validLines,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to create checkout")

      setClientSecret(result.clientSecret || "")
      setCheckoutTotals({
        subtotalCents: result.subtotalCents,
        processingFeeCents: result.processingFeeCents,
        totalCents: result.totalCents,
        currency: result.currency,
      })
      setStatusMessage("Checkout created. Enter payment details to complete charge.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create checkout")
    } finally {
      setCreatingCheckout(false)
    }
  }

  const pushCheckoutLink = async (deliveryMethod: "email" | "text" | "copy") => {
    if (!selectedStudentId) {
      setStatusMessage("Select a student first")
      return
    }

    const validLines = checkoutLines.filter((line) => line.itemId && line.quantity > 0)
    if (validLines.length === 0) {
      setStatusMessage("Add at least one training item")
      return
    }

    if (deliveryMethod === "email" && !selectedStudent?.email) {
      setStatusMessage("Selected student does not have an email address")
      return
    }

    if (deliveryMethod === "text" && !selectedStudent?.phone) {
      setStatusMessage("Selected student does not have a phone number")
      return
    }

    setPushingCheckout(deliveryMethod)
    setStatusMessage("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch("/api/admin/billing/push-checkout-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          currency,
          note,
          itemSelections: validLines,
          deliveryMethod,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to push checkout link")

      if (deliveryMethod === "copy") {
        const checkoutUrl = result.checkoutUrl as string | undefined
        if (!checkoutUrl) throw new Error("Checkout link was not returned")

        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(checkoutUrl)
          setStatusMessage("Checkout link copied to clipboard")
        } else {
          setStatusMessage(`Checkout link generated: ${checkoutUrl}`)
        }
      } else {
        setStatusMessage(
          deliveryMethod === "email"
            ? "Checkout link emailed to student"
            : "Checkout link sent to student by text"
        )
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to push checkout link")
    } finally {
      setPushingCheckout(null)
    }
  }

  const sendAccountantTextReport = async () => {
    setSendingAccountantText(true)
    setStatusMessage("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch('/api/admin/billing/accountant-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ daysBack: 7 }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to text accountant report')

      setStatusMessage(
        `Accountant text sent (${result.count || 0} transactions, ${result.mediaCount || 0} receipt/invoice attachment link(s)).`
      )
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to text accountant report')
    } finally {
      setSendingAccountantText(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <p>Loading billing workspace...</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <AdminPageShell
      title="Billing"
      description="View Stripe invoice balances, build lesson checkouts from your product list, and collect payment inside admin."
      maxWidthClassName="max-w-7xl"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void sendAccountantTextReport()}
            disabled={sendingAccountantText}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
          >
            {sendingAccountantText ? 'Sending Accountant Text...' : 'Text Accountant Purchases/Expenses'}
          </button>
          <Link
            href="/admin/items"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Manage Items
          </Link>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>
      }
    >
      {!stripeConfigured ? (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Stripe is not configured on this environment. Billing balances are shown without live Stripe invoice data.
        </div>
      ) : null}

      {statusMessage ? (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{statusMessage}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-darkText">Student Balances</h2>
          <p className="mt-1 text-sm text-slate-500">Stripe invoice balance per student</p>
          <div className="mt-4 space-y-3">
            {students.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => setSelectedStudentId(student.id)}
                className={`w-full rounded-xl border p-3 text-left ${
                  selectedStudentId === student.id
                    ? "border-golden bg-amber-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-semibold text-darkText">{student.fullName}</p>
                <p className="mt-1 text-xs text-slate-500">{student.email || "No email"}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {formatMoney(student.stripeInvoiceBalanceCents, student.stripeBalanceCurrency)}
                </p>
                <p className="text-xs text-slate-500">
                  {student.stripeInvoiceBalanceCents > 0
                    ? "Amount owed"
                    : student.stripeInvoiceBalanceCents < 0
                      ? "Credit on account"
                      : "Current balance"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-darkText">Lesson Checkout</h2>
          <p className="mt-1 text-sm text-slate-500">Select products from your existing item list and build one checkout per lesson.</p>

          {!selectedStudent ? (
            <p className="mt-4 text-sm text-slate-500">Select a student to start a checkout.</p>
          ) : (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Student
                  <input
                    value={selectedStudent.fullName}
                    readOnly
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Currency
                  <input
                    value={currency.toUpperCase()}
                    onChange={(event) => setCurrency(event.target.value.toLowerCase())}
                    maxLength={3}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="mt-5 space-y-3">
                {checkoutLines.map((line, index) => (
                  <div key={`${index}-${line.itemId}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_96px]">
                    <select
                      value={line.itemId}
                      onChange={(event) =>
                        setCheckoutLines((prev) =>
                          prev.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, itemId: event.target.value } : entry
                          )
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select training item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} {typeof item.rate_cents === "number" ? `(${formatMoney(item.rate_cents, currency)})` : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) =>
                        setCheckoutLines((prev) =>
                          prev.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, quantity: Math.max(1, Number(event.target.value || 1)) }
                              : entry
                          )
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setCheckoutLines((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCheckoutLines((prev) => [...prev, { itemId: "", quantity: 1 }])}
                className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Add Item
              </button>

              <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">
                Note (optional)
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span>Subtotal</span>
                  <span>{formatMoney(totals.subtotalCents, currency)}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Processing fee (3.5%)</span>
                  <span>{formatMoney(totals.processingFeeCents, currency)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 font-semibold text-darkText">
                  <span>Total</span>
                  <span>{formatMoney(totals.totalCents, currency)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void createCheckout()}
                disabled={creatingCheckout || totals.totalCents <= 0}
                className="mt-4 rounded-lg bg-golden px-4 py-2 text-sm font-bold text-darkText disabled:opacity-60"
              >
                {creatingCheckout ? "Creating checkout..." : "Create Checkout"}
              </button>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void pushCheckoutLink("copy")}
                  disabled={Boolean(pushingCheckout) || totals.totalCents <= 0}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
                >
                  {pushingCheckout === "copy" ? "Generating link..." : "Copy Checkout Link"}
                </button>
                <button
                  type="button"
                  onClick={() => void pushCheckoutLink("email")}
                  disabled={Boolean(pushingCheckout) || totals.totalCents <= 0 || !selectedStudent?.email}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-60"
                >
                  {pushingCheckout === "email" ? "Sending email..." : "Push Checkout Link (Email)"}
                </button>
                <button
                  type="button"
                  onClick={() => void pushCheckoutLink("text")}
                  disabled={Boolean(pushingCheckout) || totals.totalCents <= 0 || !selectedStudent?.phone}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                >
                  {pushingCheckout === "text" ? "Sending text..." : "Push Checkout Link (Text)"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Email uses the student email on file. Text uses the student phone number on file.
              </p>

              {clientSecret && checkoutTotals ? (
                <div className="mt-6 rounded-xl border border-slate-200 p-4">
                  <h3 className="text-base font-bold text-darkText">Complete Payment</h3>
                  <p className="mb-3 mt-1 text-sm text-slate-500">
                    Charging {formatMoney(checkoutTotals.totalCents, checkoutTotals.currency)}
                  </p>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutPaymentForm
                      totalCents={checkoutTotals.totalCents}
                      currency={checkoutTotals.currency}
                      onSuccess={() => {
                        setClientSecret("")
                        setCheckoutTotals(null)
                        setStatusMessage("Payment completed successfully")
                        void loadData()
                      }}
                    />
                  </Elements>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </AdminPageShell>
  )
}
