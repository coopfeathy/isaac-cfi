"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type BillingItem = {
  id: string
  name: string
  description: string | null
  type: string
  rate_cents: number | null
  is_active: boolean
  created_at: string
}

type ItemDraft = {
  name: string
  description: string
  type: string
  rateDollars: string
  isActive: boolean
}

const defaultDraft: ItemDraft = {
  name: "",
  description: "",
  type: "training",
  rateDollars: "",
  isActive: true,
}

function dollarsToCents(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

export default function AdminItemsPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [items, setItems] = useState<BillingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState("")
  const [creating, setCreating] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const [createDraft, setCreateDraft] = useState<ItemDraft>(defaultDraft)
  const [editDraft, setEditDraft] = useState<ItemDraft>(defaultDraft)

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      router.push("/login")
      return
    }

    void loadItems()
  }, [authLoading, isAdmin, router])

  const visibleItems = useMemo(
    () => items.filter((item) => (showInactive ? true : item.is_active)),
    [items, showInactive]
  )

  async function loadItems() {
    setLoading(true)
    setStatusMessage("")

    try {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, description, type, rate_cents, is_active, created_at")
        .order("created_at", { ascending: false })

      if (error) throw error
      setItems((data || []) as BillingItem[])
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load items")
    } finally {
      setLoading(false)
    }
  }

  async function handleSyncFromStripe() {
    setSyncing(true)
    setStatusMessage("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("Missing admin session")
      }

      const response = await fetch("/api/admin/billing/sync-products", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || "Unable to sync Stripe products")
      }

      await loadItems()

      const skipPreview = Array.isArray(result.skippedProducts) && result.skippedProducts.length > 0
        ? ` Skipped: ${result.skippedProducts.slice(0, 3).join(", ")}${result.skippedProducts.length > 3 ? "..." : ""}`
        : ""

      setStatusMessage(
        `Stripe sync complete. Created ${result.created || 0}, updated ${result.updated || 0}, skipped ${result.skipped || 0}.${skipPreview}`
      )
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to sync Stripe products")
    } finally {
      setSyncing(false)
    }
  }

  async function handleCreateItem(event: React.FormEvent) {
    event.preventDefault()
    setStatusMessage("")

    if (!createDraft.name.trim()) {
      setStatusMessage("Item name is required")
      return
    }

    const rateCents = dollarsToCents(createDraft.rateDollars)
    if (createDraft.rateDollars.trim() && rateCents === null) {
      setStatusMessage("Rate must be a valid non-negative number")
      return
    }

    setCreating(true)

    try {
      const { data, error } = await supabase
        .from("items")
        .insert([
          {
            name: createDraft.name.trim(),
            description: createDraft.description.trim() || null,
            type: createDraft.type.trim() || "training",
            rate_cents: rateCents,
            is_active: createDraft.isActive,
          },
        ])
        .select("id, name, description, type, rate_cents, is_active, created_at")
        .single()

      if (error) throw error

      setItems((previous) => [data as BillingItem, ...previous])
      setCreateDraft(defaultDraft)
      setStatusMessage("Training item created")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create item")
    } finally {
      setCreating(false)
    }
  }

  function beginEdit(item: BillingItem) {
    setEditingId(item.id)
    setEditDraft({
      name: item.name,
      description: item.description || "",
      type: item.type,
      rateDollars: typeof item.rate_cents === "number" ? (item.rate_cents / 100).toFixed(2) : "",
      isActive: item.is_active,
    })
  }

  async function handleSaveEdit(itemId: string) {
    setStatusMessage("")

    if (!editDraft.name.trim()) {
      setStatusMessage("Item name is required")
      return
    }

    const rateCents = dollarsToCents(editDraft.rateDollars)
    if (editDraft.rateDollars.trim() && rateCents === null) {
      setStatusMessage("Rate must be a valid non-negative number")
      return
    }

    setSavingId(itemId)

    try {
      const { error } = await supabase
        .from("items")
        .update({
          name: editDraft.name.trim(),
          description: editDraft.description.trim() || null,
          type: editDraft.type.trim() || "training",
          rate_cents: rateCents,
          is_active: editDraft.isActive,
        })
        .eq("id", itemId)

      if (error) throw error

      setItems((previous) =>
        previous.map((item) =>
          item.id === itemId
            ? {
                ...item,
                name: editDraft.name.trim(),
                description: editDraft.description.trim() || null,
                type: editDraft.type.trim() || "training",
                rate_cents: rateCents,
                is_active: editDraft.isActive,
              }
            : item
        )
      )
      setEditingId(null)
      setStatusMessage("Item updated")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update item")
    } finally {
      setSavingId(null)
    }
  }

  async function handleToggleActive(item: BillingItem) {
    setSavingId(item.id)
    setStatusMessage("")

    try {
      const nextActive = !item.is_active
      const { error } = await supabase
        .from("items")
        .update({ is_active: nextActive })
        .eq("id", item.id)

      if (error) throw error

      setItems((previous) =>
        previous.map((entry) =>
          entry.id === item.id ? { ...entry, is_active: nextActive } : entry
        )
      )
      setStatusMessage(nextActive ? "Item activated" : "Item archived")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update item status")
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(item: BillingItem) {
    if (!confirm(`Delete ${item.name}? This cannot be undone.`)) return

    setSavingId(item.id)
    setStatusMessage("")

    try {
      const { error } = await supabase.from("items").delete().eq("id", item.id)
      if (error) throw error

      setItems((previous) => previous.filter((entry) => entry.id !== item.id))
      setStatusMessage("Item deleted")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete item")
    } finally {
      setSavingId(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Loading training items...</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <AdminPageShell
      title="Training Items"
      description="Manage billing products used by admin checkout and student defaults."
      maxWidthClassName="max-w-6xl"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSyncFromStripe()}
            disabled={syncing}
            className="rounded-lg bg-golden px-4 py-2 text-sm font-semibold text-darkText disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Sync from Stripe"}
          </button>
          <button
            type="button"
            onClick={() => void loadItems()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>
      }
    >
      {statusMessage ? (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {statusMessage}
        </div>
      ) : null}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-darkText">Add Training Item</h2>
        <form onSubmit={handleCreateItem} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={createDraft.name}
            onChange={(event) => setCreateDraft((previous) => ({ ...previous, name: event.target.value }))}
            placeholder="Item name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={createDraft.type}
            onChange={(event) => setCreateDraft((previous) => ({ ...previous, type: event.target.value }))}
            placeholder="Type (training, aircraft, instructor, etc.)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={createDraft.rateDollars}
            onChange={(event) => setCreateDraft((previous) => ({ ...previous, rateDollars: event.target.value }))}
            placeholder="Rate in dollars (e.g. 65.00)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={createDraft.isActive}
              onChange={(event) => setCreateDraft((previous) => ({ ...previous, isActive: event.target.checked }))}
            />
            Active
          </label>
          <textarea
            value={createDraft.description}
            onChange={(event) => setCreateDraft((previous) => ({ ...previous, description: event.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-fit rounded-lg bg-golden px-4 py-2 text-sm font-bold text-darkText disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Item"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-darkText">Item List</h2>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            Show archived items
          </label>
        </div>

        <div className="space-y-3">
          {visibleItems.length === 0 ? (
            <p className="text-sm text-slate-500">No items found.</p>
          ) : (
            visibleItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${item.is_active ? "border-slate-200" : "border-slate-200 bg-slate-50"}`}
              >
                {editingId === item.id ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      value={editDraft.name}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, name: event.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={editDraft.type}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, type: event.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={editDraft.rateDollars}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, rateDollars: event.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Rate in dollars"
                    />
                    <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={editDraft.isActive}
                        onChange={(event) => setEditDraft((previous) => ({ ...previous, isActive: event.target.checked }))}
                      />
                      Active
                    </label>
                    <textarea
                      value={editDraft.description}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, description: event.target.value }))}
                      rows={2}
                      className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => void handleSaveEdit(item.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {savingId === item.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-base font-semibold text-darkText">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.description || "No description"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{item.type}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                          {typeof item.rate_cents === "number" ? `$${(item.rate_cents / 100).toFixed(2)}` : "No default rate"}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 ${
                            item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.is_active ? "Active" : "Archived"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(item)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => void handleToggleActive(item)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                      >
                        {item.is_active ? "Archive" : "Activate"}
                      </button>
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => void handleDelete(item)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </AdminPageShell>
  )
}
