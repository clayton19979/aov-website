'use client'

import { useEffect, useRef } from 'react'

type Props = {
  children: React.ReactNode
  className?: string
}

export function GlitchTitle({ children, className = '' }: Props) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let timeout: ReturnType<typeof setTimeout>

    function fireGlitch() {
      const el = ref.current
      if (!el) return

      el.classList.add('is-glitching')
      setTimeout(() => el.classList.remove('is-glitching'), 200)

      // Chain a second micro-glitch 80–220ms after the first for a stuttered feel
      const double = Math.random() < 0.4
      if (double) {
        setTimeout(() => {
          if (!ref.current) return
          ref.current.classList.add('is-glitching')
          setTimeout(() => ref.current?.classList.remove('is-glitching'), 120)
        }, 80 + Math.random() * 140)
      }

      // Schedule next glitch: 3–9s
      timeout = setTimeout(fireGlitch, 3000 + Math.random() * 6000)
    }

    // First glitch: 1.2–2.8s after mount so the user sees the heading first
    timeout = setTimeout(fireGlitch, 1200 + Math.random() * 1600)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <h1
      ref={ref}
      className={`glitch-title ${className}`}
    >
      {children}
    </h1>
  )
}
