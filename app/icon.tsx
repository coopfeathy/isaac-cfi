import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 88,
          background: 'linear-gradient(135deg, #C59A2A 0%, #FFD700 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        M
      </div>
    ),
    {
      width: 32,
      height: 32,
    },
  )
}
