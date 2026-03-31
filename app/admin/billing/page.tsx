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
  manualCashPaidCents: number
  cashTransactions: Array<{ id: string; amountCents: number; description: string; createdAt: string }>
  checkouts: Array<{
    id: string
    amountCents: number
    currency: string
    status: 'paid' | 'pending' | 'canceled'
    description: string | null
    createdAt: string
    itemsCount: number
    cashAppliedCents: number
  }>
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
  cashAppliedCents: number
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
  const [latestCheckoutUrl, setLatestCheckoutUrl] = useState("")
  const [copiedLink, setCopiedLink] = useState(false)

  const [cashPaymentDollars, setCashPaymentDollars] = useState("")
  const [cashPaymentNote, setCashPaymentNote] = useState("")
  const [recordingCashPayment, setRecordingCashPayment] = useState(false)
  const [showCashModal, setShowCashModal] = useState(false)
  const [removingCashTxId, setRemovingCashTxId] = useState<string | null>(null)

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

    const cashPaid = selectedStudent?.manualCashPaidCents || 0
    const cashAppliedCents = Math.min(cashPaid, lineTotal)
    const afterCash = lineTotal - cashAppliedCents
    const processingFeeCents = Math.round(afterCash * 0.035)
    return {
      subtotalCents: lineTotal,
      cashAppliedCents,
      processingFeeCents,
      totalCents: afterCash + processingFeeCents,
    }
  }, [checkoutLines, items, selectedStudent])

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
        cashAppliedCents: result.cashAppliedCents || 0,
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

        setLatestCheckoutUrl(checkoutUrl)

        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(checkoutUrl)
            setStatusMessage("Checkout link copied to clipboard")
          } catch {
            setStatusMessage("Checkout link generated below. Use Copy Link Field or manual copy.")
          }
        } else {
          setStatusMessage("Checkout link generated below. Use Copy Link Field or manual copy.")
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

  const copyCheckoutLinkField = async () => {
    if (!latestCheckoutUrl) return

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(latestCheckoutUrl)
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
        return
      }
    } catch {
      // fall through to legacy clipboard behavior
    }

    if (typeof document !== "undefined") {
      const input = document.getElementById("admin-checkout-link-field") as HTMLInputElement | null
      if (input) {
        input.focus()
        input.select()
        const copied = document.execCommand("copy")
        if (copied) {
          setCopiedLink(true)
          setTimeout(() => setCopiedLink(false), 2000)
        } else {
          setStatusMessage("Select the checkout link and copy manually")
        }
      }
    }
  }

  const recordPartialCashPayment = async () => {
    if (!selectedStudentId) {
      setStatusMessage("Select a student first")
      return
    }

    const amountDollars = Number(cashPaymentDollars)
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
      setStatusMessage("Enter a valid cash payment amount greater than 0")
      return
    }

    setRecordingCashPayment(true)
    setStatusMessage("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch("/api/admin/billing/cash-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          amountDollars,
          note: cashPaymentNote,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to record cash payment")

      setCashPaymentDollars("")
      setCashPaymentNote("")
      setStatusMessage(`Recorded partial cash payment: ${formatMoney(result.amountCents || 0, currency)}`)
      await loadData()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to record cash payment")
    } finally {
      setRecordingCashPayment(false)
    }
  }

  const removeCashPayment = async (transactionId: string, amountCents: number) => {
    if (!selectedStudentId) return
    if (!confirm(`Remove this $${(amountCents / 100).toFixed(2)} cash payment?`)) return

    setRemovingCashTxId(transactionId)
    setStatusMessage("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch("/api/admin/billing/cash-payment", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transactionId,
          studentId: selectedStudentId,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to remove cash payment")

      setStatusMessage("Cash payment removed")
      await loadData()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to remove cash payment")
    } finally {
      setRemovingCashTxId(null)
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
              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_100px_auto]">
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
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowCashModal(true)}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800"
                  >
                    💵 Cash ({formatMoney(selectedStudent.manualCashPaidCents || 0, currency)})
                  </button>
                </div>
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
                      value={line.quantity || ""}
                      onFocus={() => {
                        if (line.quantity <= 1) {
                          setCheckoutLines((prev) =>
                            prev.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, quantity: 0 } : entry
                            )
                          )
                        }
                      }}
                      onChange={(event) =>
                        setCheckoutLines((prev) =>
                          prev.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, quantity: event.target.value === "" ? 0 : Number(event.target.value) }
                              : entry
                          )
                        )
                      }
                      onBlur={() =>
                        setCheckoutLines((prev) =>
                          prev.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, quantity: Math.max(1, entry.quantity || 1) }
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
                {totals.cashAppliedCents > 0 ? (
                  <div className="flex items-center justify-between py-1 text-emerald-700">
                    <span>Cash received</span>
                    <span>− {formatMoney(totals.cashAppliedCents, currency)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between py-1">
                  <span>
                    Processing fee (3.5%{totals.cashAppliedCents > 0 ? ` on ${formatMoney(totals.subtotalCents - totals.cashAppliedCents, currency)}` : ""})
                  </span>
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

              {clientSecret ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void pushCheckoutLink("copy")}
                      disabled={Boolean(pushingCheckout)}
                      className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
                    >
                      {pushingCheckout === "copy" ? "Generating link..." : "Copy Checkout Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void pushCheckoutLink("email")}
                      disabled={Boolean(pushingCheckout) || !selectedStudent?.email}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-60"
                    >
                      {pushingCheckout === "email" ? "Sending email..." : "Push Checkout Link (Email)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void pushCheckoutLink("text")}
                      disabled={Boolean(pushingCheckout) || !selectedStudent?.phone}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                    >
                      {pushingCheckout === "text" ? "Sending text..." : "Push Checkout Link (Text)"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Email uses the student email on file. Text uses the student phone number on file.
                  </p>
                </>
              ) : null}

              {latestCheckoutUrl ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Latest Checkout Link</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id="admin-checkout-link-field"
                      value={latestCheckoutUrl}
                      readOnly
                      className="min-w-[280px] flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => void copyCheckoutLinkField()}
                      className={`rounded px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                        copiedLink
                          ? "border border-emerald-400 bg-emerald-50 text-emerald-700 scale-95"
                          : "border border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {copiedLink ? "✓ Copied!" : "Copy Link Field"}
                    </button>
                    <a
                      href={latestCheckoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                    >
                      Open Link
                    </a>
                  </div>
                </div>
              ) : null}

              {clientSecret && checkoutTotals ? (
                <div className="mt-6 rounded-xl border border-slate-200 p-4">
                  <h3 className="text-base font-bold text-darkText">Complete Payment</h3>
                  <div className="mb-3 mt-1 text-sm text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatMoney(checkoutTotals.subtotalCents, checkoutTotals.currency)}</span>
                    </div>
                    {checkoutTotals.cashAppliedCents > 0 ? (
                      <div className="flex justify-between text-emerald-700">
                        <span>Cash credit</span>
                        <span>− {formatMoney(checkoutTotals.cashAppliedCents, checkoutTotals.currency)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span>Processing fee (3.5%)</span>
                      <span>{formatMoney(checkoutTotals.processingFeeCents, checkoutTotals.currency)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-darkText">
                      <span>Charging card</span>
                      <span>{formatMoney(checkoutTotals.totalCents, checkoutTotals.currency)}</span>
                    </div>
                  </div>
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

              {showCashModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="fixed inset-0 bg-black/40" onClick={() => setShowCashModal(false)} />
                  <div className="relative z-10 w-full max-w-lg rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-emerald-900">Cash Payment</h3>
                      <button
                        type="button"
                        onClick={() => setShowCashModal(false)}
                        className="rounded-full p-1 hover:bg-slate-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    <div className="mb-4 text-sm text-emerald-800">
                      <p>Total cash received (lifetime): {formatMoney(selectedStudent.manualCashPaidCents || 0, currency)}</p>
                      {selectedStudent.stripeInvoiceBalanceCents > 0 ? (
                        <p className="mt-1">
                          Net remaining (Stripe balance − cash):{" "}
                          {formatMoney(selectedStudent.stripeInvoiceBalanceCents - (selectedStudent.manualCashPaidCents || 0), currency)}
                        </p>
                      ) : null}
                    </div>

                    <div className="mb-4">
                      <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={cashPaymentDollars}
                          onChange={(event) => setCashPaymentDollars(event.target.value)}
                          placeholder="Amount (USD)"
                          className="rounded-lg border border-emerald-300 px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={cashPaymentNote}
                          onChange={(event) => setCashPaymentNote(event.target.value)}
                          placeholder="Note (lesson date, reference, etc.)"
                          className="rounded-lg border border-emerald-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void recordPartialCashPayment()}
                        disabled={recordingCashPayment}
                        className="mt-3 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-60"
                      >
                        {recordingCashPayment ? "Recording..." : "Record Cash"}
                      </button>
                    </div>

                    {selectedStudent.cashTransactions && selectedStudent.cashTransactions.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Cash Payment History</p>
                        <div className="space-y-2">
                          {selectedStudent.cashTransactions.map((tx) => {
                            const noteMatch = tx.description.match(/Note:(.+)/)
                            const noteText = noteMatch ? noteMatch[1].trim() : ""
                            return (
                              <div key={tx.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-emerald-700">
                                    + {formatMoney(tx.amountCents, currency)} cash
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(tx.createdAt).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </span>
                                </div>
                                {noteText ? <p className="mt-1 text-xs text-slate-600">{noteText}</p> : null}
                                <button
                                  type="button"
                                  onClick={() => void removeCashPayment(tx.id, tx.amountCents)}
                                  disabled={removingCashTxId === tx.id}
                                  className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                                >
                                  {removingCashTxId === tx.id ? "Removing..." : "Remove"}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No cash payments recorded for this student yet.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {selectedStudent.checkouts && selectedStudent.checkouts.length > 0 ? (
                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-bold text-darkText">Checkout History</h3>
                  <p className="mt-1 text-xs text-slate-500">Auto-updated from Stripe</p>
                  <div className="mt-3 space-y-2">
                    {selectedStudent.checkouts.map((co) => (
                      <div key={co.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-darkText">
                            {formatMoney(co.amountCents, co.currency)}
                            {co.itemsCount > 0 ? (
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                {co.itemsCount} item{co.itemsCount !== 1 ? "s" : ""}
                              </span>
                            ) : null}
                            {co.cashAppliedCents > 0 ? (
                              <span className="ml-2 text-xs font-normal text-emerald-600">
                                ({formatMoney(co.cashAppliedCents, co.currency)} cash applied)
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(co.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            co.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : co.status === "canceled"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {co.status === "paid" ? "Paid" : co.status === "canceled" ? "Canceled" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </AdminPageShell>
  )
}
