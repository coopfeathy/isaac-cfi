import type { AppProps } from "next/app"
import { BookingProvider } from "../app/contexts/BookingContext"

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <BookingProvider>
      <Component {...pageProps} />
    </BookingProvider>
  )
}

export default MyApp

