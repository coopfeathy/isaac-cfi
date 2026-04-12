import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discovery Flight Weddings | Merlin Flight Training',
  description:
    'Make your wedding unforgettable — hire a certified flight instructor to give discovery flights to you and your guests at the airport of your choice. Full-day packages available.',
  alternates: {
    canonical: 'https://merlinflighttraining.com/weddings',
  },
  openGraph: {
    title: 'Discovery Flight Weddings | Merlin Flight Training',
    description:
      'Make your wedding unforgettable with discovery flights for you and your guests. Full-day packages at the airport of your choice.',
    url: 'https://merlinflighttraining.com/weddings',
  },
}

export default function WeddingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
