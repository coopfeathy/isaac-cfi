import "./globals.css"
import { Inter } from "next/font/google"
import Footer from "./components/Footer"
import dynamic from "next/dynamic"
import type React from "react"
import { AuthProvider } from "./contexts/AuthContext"

const DynamicHeader = dynamic(() => import("./components/Header"), { ssr: false })

const inter = Inter({ subsets: ["latin"] })

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
      <body className={inter.className}>
        <AuthProvider>
          <DynamicHeader />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}

