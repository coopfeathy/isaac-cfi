// Server-side proxy for NOAA's Aviation Weather Center METAR JSON endpoint.
// Calling AWC directly from the browser sometimes fails (CORS varies by
// deployment, and some corporate networks block aviationweather.gov). Routing
// through our own origin keeps the Ops Pulse weather line reliable.

import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const icaoRaw = (searchParams.get('icao') || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{3,4}$/.test(icaoRaw)) {
    return NextResponse.json({ error: 'invalid icao' }, { status: 400 })
  }

  const upstreamUrl = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(icaoRaw)}&format=json`
  try {
    const res = await fetch(upstreamUrl, {
      // Never let a CDN cache a weather response for long.
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: 'upstream_error', status: res.status },
        { status: 502 },
      )
    }
    const text = await res.text()
    // AWC sometimes returns `[]` or HTML on a bad station; normalize so the
    // client always gets JSON.
    try {
      const json = JSON.parse(text)
      return new NextResponse(JSON.stringify(json), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          // Cache briefly at the edge — METARs update every ~hour.
          'cache-control': 'public, max-age=120, s-maxage=300',
        },
      })
    } catch {
      return NextResponse.json({ error: 'bad_upstream_body' }, { status: 502 })
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'fetch_failed', message: (err as Error).message },
      { status: 502 },
    )
  }
}
