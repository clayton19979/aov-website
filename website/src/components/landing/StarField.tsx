'use client'

import { useEffect, useRef } from 'react'

export function StarField() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const count = 120
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < count; i++) {
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
