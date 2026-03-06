import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          color: '#C59A2A',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
          width: '100%',
          height: '100%',
          padding: '50px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 'bold', marginBottom: 20 }}>
          Merlin Flight Training
        </div>
        <div style={{ fontSize: 40, color: '#FFD700' }}>
          Professional Pilot Training in NYC & NJ
        </div>
        <div style={{ fontSize: 30, color: '#999999', marginTop: 20 }}>
          FAA-Certified Instructors • Discovery Flights • Pilot Certification
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
