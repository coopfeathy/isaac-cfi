"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Aircraft, AircraftHoursEntry } from "@/lib/supabase"

/* ───────── helpers ───────── */

type HoursDraft = {
  date: string
  hobbsStart: string
  hobbsEnd: string
  tachStart: string
  tachEnd: string
  pilotName: string
  flightType: string
  notes: string
}

const emptyDraft: HoursDraft = {
  date: new Date().toISOString().slice(0, 10),
  hobbsStart: "",
  hobbsEnd: "",
  tachStart: "",
  tachEnd: "",
  pilotName: "",
  flightType: "training",
  notes: "",
}

function parseNum(v: string): number | null {
  if (!v.trim()) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function fmtHours(v: number | null) {
  return v !== null && v !== undefined ? v.toFixed(1) : "—"
}

/* ───────── component ───────── */

export default function AdminAircraftPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  /* data state */
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [entries, setEntries] = useState<AircraftHoursEntry[]>([])

  /* ui state */
  const [loading, setLoading] = useState(true)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [createDraft, setCreateDraft] = useState<HoursDraft>(emptyDraft)
  const [editDraft, setEditDraft] = useState<HoursDraft>(emptyDraft)

  /* derived */
  const selected = useMemo(
    () => aircraft.find((a) => a.id === selectedId) ?? null,
    [aircraft, selectedId]
  )

  const totalHobbs = useMemo(
    () => entries.reduce((sum, e) => sum + (e.flight_hours ?? 0), 0),
    [entries]
  )
  const totalTach = useMemo(
    () => entries.reduce((sum, e) => sum + (e.tach_hours ?? 0), 0),
    [entries]
  )

  /* ───────── load aircraft list ───────── */

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      router.push("/login")
      return
    }
    void loadAircraft()
  }, [authLoading, isAdmin, router])

  async function loadAircraft() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("aircraft")
        .select("*")
        .order("registration")
      if (error) throw error
      const list = (data ?? []) as Aircraft[]
      setAircraft(list)
      // auto-select first (or N9725U if present)
      if (list.length > 0) {
        const target = list.find((a) => a.registration === "N9725U") ?? list[0]
        setSelectedId(target.id)
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to load aircraft")
    } finally {
      setLoading(false)
    }
  }

  /* ───────── load hours for selected aircraft ───────── */

  useEffect(() => {
    if (!selectedId) return
    void loadEntries(selectedId)
  }, [selectedId])

  async function loadEntries(aircraftId: string) {
    setEntriesLoading(true)
    setStatusMessage("")
    try {
      const { data, error } = await supabase
        .from("aircraft_hours")
        .select("*")
        .eq("aircraft_id", aircraftId)
        .order("date", { ascending: false })
      if (error) throw error
      setEntries((data ?? []) as AircraftHoursEntry[])
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to load hours")
    } finally {
      setEntriesLoading(false)
    }
  }

  /* ───────── create entry ───────── */

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setStatusMessage("")

    const hobbsStart = parseNum(createDraft.hobbsStart)
    const hobbsEnd = parseNum(createDraft.hobbsEnd)
    const tachStart = parseNum(createDraft.tachStart)
    const tachEnd = parseNum(createDraft.tachEnd)

    if (hobbsEnd !== null && hobbsStart !== null && hobbsEnd < hobbsStart) {
      setStatusMessage("Hobbs end must be greater than hobbs start")
      return
    }
    if (tachEnd !== null && tachStart !== null && tachEnd < tachStart) {
      setStatusMessage("Tach end must be greater than tach start")
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from("aircraft_hours")
        .insert([
          {
            aircraft_id: selectedId,
            date: createDraft.date,
            hobbs_start: hobbsStart,
            hobbs_end: hobbsEnd,
            tach_start: tachStart,
            tach_end: tachEnd,
            pilot_name: createDraft.pilotName.trim() || null,
            flight_type: createDraft.flightType || "training",
            notes: createDraft.notes.trim() || null,
          },
        ])
        .select("*")
        .single()

      if (error) throw error
      setEntries((prev) => [data as AircraftHoursEntry, ...prev])
      setCreateDraft({ ...emptyDraft, date: new Date().toISOString().slice(0, 10) })
      setStatusMessage("Hours entry added")
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to add entry")
    } finally {
      setCreating(false)
    }
  }

  /* ───────── edit entry ───────── */

  function beginEdit(entry: AircraftHoursEntry) {
    setEditingId(entry.id)
    setEditDraft({
      date: entry.date,
      hobbsStart: entry.hobbs_start?.toString() ?? "",
      hobbsEnd: entry.hobbs_end?.toString() ?? "",
      tachStart: entry.tach_start?.toString() ?? "",
      tachEnd: entry.tach_end?.toString() ?? "",
      pilotName: entry.pilot_name ?? "",
      flightType: entry.flight_type ?? "training",
      notes: entry.notes ?? "",
    })
  }

  async function handleSaveEdit(entryId: string) {
    setStatusMessage("")
    const hobbsStart = parseNum(editDraft.hobbsStart)
    const hobbsEnd = parseNum(editDraft.hobbsEnd)
    const tachStart = parseNum(editDraft.tachStart)
    const tachEnd = parseNum(editDraft.tachEnd)

    if (hobbsEnd !== null && hobbsStart !== null && hobbsEnd < hobbsStart) {
      setStatusMessage("Hobbs end must be greater than hobbs start")
      return
    }

    setSavingId(entryId)
    try {
      const { error } = await supabase
        .from("aircraft_hours")
        .update({
          date: editDraft.date,
          hobbs_start: hobbsStart,
          hobbs_end: hobbsEnd,
          tach_start: tachStart,
          tach_end: tachEnd,
          pilot_name: editDraft.pilotName.trim() || null,
          flight_type: editDraft.flightType || "training",
          notes: editDraft.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId)

      if (error) throw error

      // Reload to get computed columns
      if (selectedId) await loadEntries(selectedId)
      setEditingId(null)
      setStatusMessage("Entry updated")
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to update entry")
    } finally {
      setSavingId(null)
    }
  }

  /* ───────── delete entry ───────── */

  async function handleDelete(entry: AircraftHoursEntry) {
    if (!confirm("Delete this hours entry? This cannot be undone.")) return
    setSavingId(entry.id)
    setStatusMessage("")
    try {
      const { error } = await supabase.from("aircraft_hours").delete().eq("id", entry.id)
      if (error) throw error
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      setStatusMessage("Entry deleted")
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to delete entry")
    } finally {
      setSavingId(null)
    }
  }

  /* ───────── render ───────── */

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-500">Loading fleet data…</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <AdminPageShell
      title="Aircraft"
      description="Track flight hours, hobbs & tach time for each aircraft in the Merlin fleet."
      maxWidthClassName="max-w-6xl"
      actions={
        <button
          type="button"
          onClick={() => {
            if (selectedId) void loadEntries(selectedId)
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Refresh
        </button>
      }
    >
      {/* aircraft selector */}
      {aircraft.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {aircraft.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                selectedId === a.id
                  ? "border-golden bg-golden/15 text-darkText"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              {a.registration} — {a.model}
            </button>
          ))}
        </div>
      )}

      {/* status message */}
      {statusMessage && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {statusMessage}
        </div>
      )}

      {selected && (
        <>
          {/* summary cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-400">Aircraft</p>
              <p className="mt-1 text-2xl font-bold text-darkText">{selected.registration}</p>
              <p className="mt-0.5 text-sm text-slate-600">
                {selected.year ? `${selected.year} ` : ""}
                {selected.model}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-400">Total Hobbs</p>
              <p className="mt-1 text-2xl font-bold text-darkText">{totalHobbs.toFixed(1)} hrs</p>
              <p className="mt-0.5 text-sm text-slate-600">{entries.length} flight entries</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-400">Total Tach</p>
              <p className="mt-1 text-2xl font-bold text-darkText">{totalTach.toFixed(1)} hrs</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-400">Rate</p>
              <p className="mt-1 text-2xl font-bold text-darkText">
                ${(selected.rate_per_hour_cents / 100).toFixed(2)}/hr
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    selected.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {selected.status ?? "active"}
                </span>
              </p>
            </div>
          </div>

          {/* add hours form */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-darkText">Log Flight Hours</h2>
            <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
                <input
                  type="date"
                  value={createDraft.date}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Hobbs Start</label>
                <input
                  type="number"
                  step="0.1"
                  value={createDraft.hobbsStart}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, hobbsStart: e.target.value }))}
                  placeholder="e.g. 1234.5"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Hobbs End</label>
                <input
                  type="number"
                  step="0.1"
                  value={createDraft.hobbsEnd}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, hobbsEnd: e.target.value }))}
                  placeholder="e.g. 1236.2"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Tach Start</label>
                <input
                  type="number"
                  step="0.1"
                  value={createDraft.tachStart}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, tachStart: e.target.value }))}
                  placeholder="e.g. 980.3"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Tach End</label>
                <input
                  type="number"
                  step="0.1"
                  value={createDraft.tachEnd}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, tachEnd: e.target.value }))}
                  placeholder="e.g. 981.8"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Pilot</label>
                <input
                  value={createDraft.pilotName}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, pilotName: e.target.value }))}
                  placeholder="Pilot name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Flight Type</label>
                <select
                  value={createDraft.flightType}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, flightType: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="training">Training</option>
                  <option value="discovery">Discovery Flight</option>
                  <option value="rental">Rental</option>
                  <option value="checkride">Checkride</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="ferry">Ferry</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-500">Notes</label>
                <input
                  value={createDraft.notes}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-lg bg-golden px-4 py-2 text-sm font-bold text-darkText disabled:opacity-60"
                >
                  {creating ? "Logging…" : "Log Hours"}
                </button>
              </div>
            </form>
          </section>

          {/* hours log table */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-darkText">Hours Log</h2>
            </div>

            {entriesLoading ? (
              <div className="p-5 text-sm text-slate-500">Loading entries…</div>
            ) : entries.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">
                No hours logged yet for {selected.registration}. Use the form above to add the first entry.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Hobbs Start</th>
                      <th className="px-4 py-3">Hobbs End</th>
                      <th className="px-4 py-3">Flight Hrs</th>
                      <th className="px-4 py-3">Tach Start</th>
                      <th className="px-4 py-3">Tach End</th>
                      <th className="px-4 py-3">Tach Hrs</th>
                      <th className="px-4 py-3">Pilot</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) =>
                      editingId === entry.id ? (
                        <tr key={entry.id} className="bg-slate-50">
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={editDraft.date}
                              onChange={(e) => setEditDraft((p) => ({ ...p, date: e.target.value }))}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.1"
                              value={editDraft.hobbsStart}
                              onChange={(e) => setEditDraft((p) => ({ ...p, hobbsStart: e.target.value }))}
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.1"
                              value={editDraft.hobbsEnd}
                              onChange={(e) => setEditDraft((p) => ({ ...p, hobbsEnd: e.target.value }))}
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-slate-400">auto</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.1"
                              value={editDraft.tachStart}
                              onChange={(e) => setEditDraft((p) => ({ ...p, tachStart: e.target.value }))}
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.1"
                              value={editDraft.tachEnd}
                              onChange={(e) => setEditDraft((p) => ({ ...p, tachEnd: e.target.value }))}
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-slate-400">auto</td>
                          <td className="px-4 py-2">
                            <input
                              value={editDraft.pilotName}
                              onChange={(e) => setEditDraft((p) => ({ ...p, pilotName: e.target.value }))}
                              className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editDraft.flightType}
                              onChange={(e) => setEditDraft((p) => ({ ...p, flightType: e.target.value }))}
                              className="rounded border border-slate-300 px-2 py-1 text-sm"
                            >
                              <option value="training">Training</option>
                              <option value="discovery">Discovery</option>
                              <option value="rental">Rental</option>
                              <option value="checkride">Checkride</option>
                              <option value="maintenance">Maintenance</option>
                              <option value="ferry">Ferry</option>
                              <option value="other">Other</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={savingId === entry.id}
                                onClick={() => void handleSaveEdit(entry.id)}
                                className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {savingId === entry.id ? "…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={entry.id} className="hover:bg-slate-50/60">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-darkText">
                            {entry.date}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{fmtHours(entry.hobbs_start)}</td>
                          <td className="px-4 py-3 text-slate-600">{fmtHours(entry.hobbs_end)}</td>
                          <td className="px-4 py-3 font-semibold text-darkText">
                            {fmtHours(entry.flight_hours)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{fmtHours(entry.tach_start)}</td>
                          <td className="px-4 py-3 text-slate-600">{fmtHours(entry.tach_end)}</td>
                          <td className="px-4 py-3 font-semibold text-darkText">
                            {fmtHours(entry.tach_hours)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{entry.pilot_name ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                              {entry.flight_type ?? "training"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => beginEdit(entry)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={savingId === entry.id}
                                onClick={() => void handleDelete(entry)}
                                className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AdminPageShell>
  )
}
