'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { doctrine } from '@/data/doctrine'

const PHRASES = doctrine.commonPhrases
const TYPE_MS = 55
const ERASE_MS = 28
const HOLD_MS = 2200

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

export function PhraseCycler() {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState<'typing' | 'erasing'>('typing')
  const reduced = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false
  )

  const full = PHRASES[index]
  const visible = reduced ? full : displayed

  // Reduced motion: swap the whole phrase on a timer, no per-character animation.
  useEffect(() => {
    if (!reduced) return
    const t = setTimeout(() => setIndex(i => (i + 1) % PHRASES.length), 7000)
    return () => clearTimeout(t)
  }, [reduced, index])

  // Typewriter: type out → hold → erase → advance to the next phrase.
  useEffect(() => {
    if (reduced) return

    if (phase === 'typing') {
      if (displayed === full) {
        const t = setTimeout(() => setPhase('erasing'), HOLD_MS)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setDisplayed(full.slice(0, displayed.length + 1)), TYPE_MS)
      return () => clearTimeout(t)
    }

    if (displayed === '') {
      const t = setTimeout(() => {
        setIndex(i => (i + 1) % PHRASES.length)
        setPhase('typing')
      }, 0)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setDisplayed(full.slice(0, displayed.length - 1)), ERASE_MS)
    return () => clearTimeout(t)
  }, [displayed, phase, full, reduced])

  return (
    <span
      role="status"
      aria-live="polite"
      className="font-mono text-xs tracking-widest uppercase text-white/20"
    >
      <span aria-hidden="true">{visible}</span>
      <span aria-hidden="true" className="phrase-caret text-void-teal/50">▋</span>
      <span className="sr-only">{full}</span>
    </span>
  )
}
