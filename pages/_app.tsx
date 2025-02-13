import type { AppProps } from "next/app"
import { BookingProvider } from "../app/contexts/BookingContext"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <BookingProvider>
      <Component {...pageProps} />
    </BookingProvider>
  )
}

