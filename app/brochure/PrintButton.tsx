'use client'

// Client-component wrapper for the "Save as PDF" button on /brochure.
// The brochure page itself stays a server component (exports metadata),
// so the only client-side surface is this single button.

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-golden text-black px-4 py-2 rounded text-sm font-semibold hover:bg-yellow-500 transition-colors"
      style={{ fontFamily: 'inherit' }}
    >
      Save as PDF
    </button>
  )
}
