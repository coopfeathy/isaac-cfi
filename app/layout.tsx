import "./globals.css"
import { Inter } from "next/font/google"
import Footer from "./components/Footer"
import dynamic from "next/dynamic"
import type React from "react"

const DynamicHeader = dynamic(() => import("./components/Header"), { ssr: false })

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Isaac's Flight School",
  description: "Book your flight lessons with Isaac and start your journey to becoming a pilot",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DynamicHeader />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}

