'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'

const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#░▒▓|@#$%'

export type GlitchTextResult = {
  displayed: string
  isGlitching: boolean
}

function subscribeToReducedMotion(onStoreChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useGlitchText(text: string): GlitchTextResult {
  const [displayed, setDisplayed] = useState(text)
  const [isGlitching, setIsGlitching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false
  )

  useEffect(() => {
    mountedRef.current = true

    if (reducedMotion) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      return () => {
        mountedRef.current = false
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    function corrupt(original: string): string {
      return original
        .split('')
        .map((char, index, chars) => {
          if (char === ' ') return ' '
          const previous = chars[index - 1]
          const next = chars[index + 1]
          const isWordEdge = index === 0 || index === chars.length - 1 || previous === ' ' || next === ' '

          if (isWordEdge) return char

          return Math.random() > 0.78
            ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            : char
        })
        .join('')
    }

    function scheduleGlitch() {
      if (!mountedRef.current) return
      const delay = 4000 + Math.random() * 4000
      timerRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        setIsGlitching(true)
        setDisplayed(corrupt(text))

        timerRef.current = setTimeout(() => {
          if (!mountedRef.current) return
          setDisplayed(text)
          setIsGlitching(false)
          scheduleGlitch()
        }, 80)
      }, delay)
    }

    scheduleGlitch()

    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, reducedMotion])

  return reducedMotion
    ? { displayed: text, isGlitching: false }
    : { displayed, isGlitching }
}
