'use client'

import { useState, useEffect } from 'react'
import { doctrine } from '@/data/doctrine'

const PHRASES = doctrine.commonPhrases
const TYPE_MS = 55
const ERASE_MS = 28
const HOLD_MS = 2200

export function PhraseCycler() {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState<'typing' | 'erasing'>('typing')
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const full = PHRASES[index]

  // Reduced motion: swap the whole phrase on a timer, no per-character animation.
  useEffect(() => {
    if (!reduced) return
    setDisplayed(full)
    const t = setTimeout(() => setIndex(i => (i + 1) % PHRASES.length), 7000)
    return () => clearTimeout(t)
  }, [reduced, full])

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
      setIndex(i => (i + 1) % PHRASES.length)
      setPhase('typing')
      return
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
      <span aria-hidden="true">{displayed}</span>
      <span aria-hidden="true" className="phrase-caret text-void-teal/50">▋</span>
      <span className="sr-only">{full}</span>
    </span>
  )
}
