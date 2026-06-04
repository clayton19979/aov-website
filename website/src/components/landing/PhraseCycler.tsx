'use client'

import { useState, useEffect } from 'react'
import { doctrine } from '@/data/doctrine'

const PHRASES = doctrine.commonPhrases

export function PhraseCycler() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (visible) return
    const timeout = setTimeout(() => {
      setIndex(i => (i + 1) % PHRASES.length)
      setVisible(true)
    }, 300)
    return () => clearTimeout(timeout)
  }, [visible])

  return (
    <span
      role="status"
      aria-live="polite"
      className={`font-mono text-xs tracking-widest uppercase text-white/20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {PHRASES[index]}
    </span>
  )
}
