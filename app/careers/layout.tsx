import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pilot Career Path | Merlin Flight Training',
  description:
    'Train at Merlin and build a career in aviation. Student to CFI to hired instructor — the full pathway explained.',
  openGraph: {
    title: 'Pilot Career Path | Merlin Flight Training',
    description: 'Train at Merlin and build a career in aviation.',
    url: 'https://merlinflighttraining.com/careers',
    type: 'website',
  },
}

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
