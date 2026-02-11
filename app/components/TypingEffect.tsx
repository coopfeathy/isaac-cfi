'use client'

import { useState, useEffect } from 'react'

interface TypingEffectProps {
  words: string[]
  className?: string
  defaultPause?: number
  wordPauseDuration?: Record<number, number> // Map word index to pause duration
}

export default function TypingEffect({ 
  words, 
  className = '',
  defaultPause = 3300,
  wordPauseDuration = {}
}: TypingEffectProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)

  useEffect(() => {
    const currentWord = words[wordIndex]
    const pauseDuration = wordPauseDuration[wordIndex] ?? defaultPause
    let timeout: NodeJS.Timeout

    if (isWaiting) {
      // Pause after completing a word
      timeout = setTimeout(() => {
        setIsWaiting(false)
        setIsDeleting(true)
      }, pauseDuration)
    } else if (isDeleting) {
      // Backspace
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1))
        }, 50) // Faster backspace
      } else {
        // Move to next word
        setIsDeleting(false)
        setWordIndex((prev) => (prev + 1) % words.length)
      }
    } else {
      // Type forward
      if (displayedText.length < currentWord.length) {
        timeout = setTimeout(() => {
          setDisplayedText(currentWord.slice(0, displayedText.length + 1))
        }, 100) // Typing speed
      } else {
        // Word is complete, wait before deleting
        setIsWaiting(true)
      }
    }

    return () => clearTimeout(timeout)
  }, [displayedText, wordIndex, isDeleting, isWaiting, words, defaultPause, wordPauseDuration])

  return (
    <div className={className}>
      {displayedText}
      <span className="animate-pulse">|</span>
    </div>
  )
}
