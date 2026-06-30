"use client"

import { useEffect } from "react"

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Hide the scrollbar visually on the quiz route ONLY — without disabling
    // scroll. (overflow:hidden would kill scrolling; this just hides the bar.)
    const style = document.createElement("style")
    style.setAttribute("data-quiz-scrollbar", "")
    style.textContent = `
      html::-webkit-scrollbar,
      body::-webkit-scrollbar { display: none; }
      html, body {
        scrollbar-width: none;
        -ms-overflow-style: none;
        background-color: #0D0F10;
      }
      body header, body footer { display: none !important; }
    `
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])

  return <>{children}</>
}
