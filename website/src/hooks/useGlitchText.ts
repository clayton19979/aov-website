'use client'

import { useState, useEffect, useRef } from 'react'

const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#░▒▓|@#$%'

export type GlitchTextResult = {
  displayed: string
  isGlitching: boolean
}

export function useGlitchText(text: string): GlitchTextResult {
  const [displayed, setDisplayed] = useState(text)
  const [isGlitching, setIsGlitching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function corrupt(original: string): string {
      return original
        .split('')
        .map(char => {
          if (char === ' ') return ' '
          return Math.random() > 0.55
            ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            : char
        })
        .join('')
    }

    function scheduleGlitch() {
      const delay = 4000 + Math.random() * 4000
      timerRef.current = setTimeout(() => {
        setIsGlitching(true)
        setDisplayed(corrupt(text))

        timerRef.current = setTimeout(() => {
          setDisplayed(text)
          setIsGlitching(false)
          scheduleGlitch()
        }, 80)
      }, delay)
    }

    scheduleGlitch()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text])

  return { displayed, isGlitching }
}
