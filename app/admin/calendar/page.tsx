"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type ConnectionStatus = "idle" | "testing" | "connected" | "error"

export default function AdminCalendarSettingsPage() {
  const [appleId, setAppleId] = useState("")
  const [calendarUrl, setCalendarUrl] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("idle")
  const [connMessage, setConnMessage] = useState("")
  const [calendars, setCalendars] = useState<{ displayName: string; url: string }[]>([])
  const [statusMessage, setStatusMessage] = useState("")
  const [syncResult, setSyncResult] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const res = await fetch("/api/admin/caldav/settings", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (res.ok) {
          const data = await res.json()
          if (data.settings) {
            setAppleId(data.settings.apple_id || "")
            setCalendarUrl(data.settings.calendar_url || "")
            setIsActive(data.settings.is_active ?? true)
            setLastSyncAt(data.settings.last_sync_at || null)
          }
        }
      } catch (err) {
        console.error("Failed to load CalDAV settings:", err)
      } finally {
        setLoading(false)
      }
    }

    void loadSettings()
  }, [])

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error("Not authenticated")
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
  }

  const saveSettings = async () => {
    setSaving(true)
    setStatusMessage("")

    try {
      const headers = await getAuthHeader()
      const res = await fetch("/api/admin/caldav/settings", {
        method: "POST",
        headers,
        body: JSON.stringify({ apple_id: appleId.trim(), calendar_url: calendarUrl.trim() || null, is_active: isActive }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save settings")
      }

      setStatusMessage("Settings saved successfully.")
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setConnStatus("testing")
    setConnMessage("")
    setCalendars([])

    try {
      const headers = await getAuthHeader()
      const res = await fetch("/api/admin/caldav/test", { headers })
      const data = await res.json()

      if (res.ok) {
        setConnStatus("connected")
        setConnMessage(`Connected! Found ${data.calendars?.length || 0} calendar(s).`)
        setCalendars(data.calendars || [])
      } else {
        setConnStatus("error")
        setConnMessage(data.error || "Connection failed")
      }
    } catch (err) {
      setConnStatus("error")
      setConnMessage(err instanceof Error ? err.message : "Connection failed")
    }
  }

  const triggerSync = async () => {
    setSyncing(true)
    setSyncResult("")

    try {
      const headers = await getAuthHeader()
      const res = await fetch("/api/admin/caldav/sync", { method: "POST", headers })
      const data = await res.json()

      if (res.ok) {
        setSyncResult(
          `Sync complete: ${data.pushed || 0} pushed, ${data.pulled || 0} pulled, ${data.deleted || 0} deleted, ${data.conflicts || 0} conflicts, ${data.errors || 0} errors`
        )
        setLastSyncAt(new Date().toISOString())
      } else {
        setSyncResult(data.error || "Sync failed")
      }
    } catch (err) {
      setSyncResult(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-darkText mb-1">Apple Calendar Sync</h1>
      <p className="text-sm text-gray-600 mb-6">
        Connect your iCloud calendar to automatically sync flight lessons with your student dashboard.
      </p>

      {/* Connection Health */}
      <div className="mb-6 flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div
          className={`w-3 h-3 rounded-full ${
            connStatus === "connected"
              ? "bg-green-500"
              : connStatus === "error"
                ? "bg-red-500"
                : "bg-gray-300"
          }`}
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-darkText">
            {connStatus === "connected" ? "Connected" : connStatus === "error" ? "Connection Error" : "Not Tested"}
          </p>
          {lastSyncAt && (
            <p className="text-xs text-gray-500">
              Last sync: {new Date(lastSyncAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <label className="block text-sm font-semibold text-darkText">
          Apple ID (email)
          <input
            type="email"
            value={appleId}
            onChange={(e) => setAppleId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="your@icloud.com"
          />
        </label>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>App-Specific Password:</strong> Your iCloud app-specific password must be set as the{" "}
          <code className="bg-amber-100 px-1 rounded">ICLOUD_APP_PASSWORD</code> environment variable on Netlify.
          Generate one at{" "}
          <a
            href="https://appleid.apple.com/account/manage"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold"
          >
            appleid.apple.com
          </a>.
        </div>

        <label className="block text-sm font-semibold text-darkText">
          Calendar URL (optional — auto-detected if blank)
          <input
            type="url"
            value={calendarUrl}
            onChange={(e) => setCalendarUrl(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="https://caldav.icloud.com/..."
          />
          <span className="text-xs text-gray-500 mt-1 block">
            Leave blank to use the default calendar. Test Connection to discover available calendars.
          </span>
        </label>

        {/* Calendar Picker from test results */}
        {calendars.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-darkText">Available Calendars:</p>
            <div className="space-y-1">
              {calendars.map((cal) => (
                <button
                  key={cal.url}
                  type="button"
                  onClick={() => setCalendarUrl(cal.url)}
                  className={`block w-full text-left px-3 py-2 rounded border text-sm transition-colors ${
                    calendarUrl === cal.url
                      ? "border-golden bg-amber-50 font-semibold text-darkText"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  {cal.displayName || cal.url}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-darkText cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Enable automatic sync (every 10 minutes)
          </label>
        </div>

        {statusMessage && (
          <p className={`text-sm ${statusMessage.includes("success") ? "text-green-700" : "text-red-700"}`}>
            {statusMessage}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving || !appleId.trim()}
            className="px-4 py-2 rounded bg-golden text-darkText font-semibold text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>

          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={connStatus === "testing" || !appleId.trim()}
            className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold disabled:opacity-50"
          >
            {connStatus === "testing" ? "Testing..." : "Test Connection"}
          </button>
        </div>

        {connMessage && (
          <p className={`text-sm ${connStatus === "connected" ? "text-green-700" : "text-red-700"}`}>
            {connMessage}
          </p>
        )}
      </div>

      {/* Manual Sync */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-darkText mb-2">Manual Sync</h2>
        <p className="text-sm text-gray-600 mb-4">
          Trigger a full bidirectional sync between your Apple Calendar and the booking system.
        </p>

        <button
          type="button"
          onClick={() => void triggerSync()}
          disabled={syncing || !appleId.trim()}
          className="px-4 py-2 rounded bg-blue-600 text-white font-semibold text-sm disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>

        {syncResult && (
          <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 border border-gray-200">
            {syncResult}
          </p>
        )}
      </div>
    </div>
  )
}
