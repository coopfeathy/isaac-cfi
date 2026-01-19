import "./globals.css"
import Footer from "./components/Footer"
import SimpleHeader from "./components/SimpleHeader"
import type React from "react"
import { AuthProvider } from "./contexts/AuthContext"
import { CalendlyProvider } from "./components/CalendlyButton"

export const metadata = {
  title: "Merlin Flight Training",
  description: "Book your flight lessons and NYC flight tours with Merlin Flight Training",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <CalendlyProvider>
            <SimpleHeader />
            <main>{children}</main>
            <Footer />
          </CalendlyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

