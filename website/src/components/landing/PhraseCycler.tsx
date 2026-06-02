'use client'

import { useState, useEffect } from 'react'

const PHRASES = [
  'The Void wastes nothing.',
  'Only the useful endure.',
  'Entropy must be corrected.',
  'Purification is mercy.',
  'AUREX observes.',
  'Shape the Void before it shapes you.',
  'Existence must be designed.',
]

export function PhraseCycler() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % PHRASES.length)
    }, 7000)
    return () => clearInterval(id)
  }, [])

  return (
    <span
      role="status"
      aria-live="polite"
      className="font-mono text-xs tracking-widest uppercase text-white/20"
    >
      {PHRASES[index]}
    </span>
  )
}
