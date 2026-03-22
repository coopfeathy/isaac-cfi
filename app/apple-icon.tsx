import fs from 'node:fs'
import path from 'node:path'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

const faviconSrc = `data:image/png;base64,${fs
  .readFileSync(path.join(process.cwd(), 'public', 'favicon.png'))
  .toString('base64')}`

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
        }}
      >
        <img src={faviconSrc} alt="Merlin Flight Training" width="180" height="180" />
      </div>
    ),
    size,
  )
}