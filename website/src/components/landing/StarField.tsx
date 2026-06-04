'use client'

import { useEffect, useRef } from 'react'

export function StarField() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const fragment = document.createDocumentFragment()

    // White background stars
    for (let i = 0; i < 120; i++) {
      const star = document.createElement('div')
      const size = Math.random() * 1.5 + 0.5
      const x = Math.random() * 100
      const y = Math.random() * 100
      const duration = 3 + Math.random() * 6
      const delay = Math.random() * 8

      star.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: rgba(255,255,255,${0.2 + Math.random() * 0.5});
        animation: star-twinkle ${duration}s ${delay}s infinite alternate ease-in-out;
      `
      fragment.appendChild(star)
    }

    // Accent-tinted void particles — track the active theme accent
    for (let i = 0; i < 18; i++) {
      const star = document.createElement('div')
      const size = 1 + Math.random() * 2
      const x = Math.random() * 100
      const y = Math.random() * 100
      const duration = 2 + Math.random() * 4
      const delay = Math.random() * 8
      const pct = Math.round(30 + Math.random() * 25)
      const glowPx = Math.round(size * 3)
      const glowSpread = Math.round(size)

      star.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--accent) ${pct}%, transparent);
        box-shadow: 0 0 ${glowPx}px ${glowSpread}px color-mix(in srgb, var(--accent) 18%, transparent);
        animation: star-twinkle ${duration}s ${delay}s infinite alternate ease-in-out;
      `
      fragment.appendChild(star)
    }

    container.appendChild(fragment)

    return () => {
      while (container.firstChild) container.removeChild(container.firstChild)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    />
  )
}
