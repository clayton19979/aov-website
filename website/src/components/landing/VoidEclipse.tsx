'use client'

import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'

export function VoidEclipse() {
  const controls = useAnimation()

  useEffect(() => {
    let mounted = true

    async function scheduleFlicker() {
      if (!mounted) return
      const delay = 7000 + Math.random() * 12000
      await new Promise(resolve => setTimeout(resolve, delay))
      if (!mounted) return

      // Multi-beat flicker like a black hole consuming matter
      await controls.start({ opacity: 0.04, scale: 0.99, transition: { duration: 0.05 } })
      if (!mounted) return
      await controls.start({ opacity: 1.1, scale: 1.01, transition: { duration: 0.04 } })
      if (!mounted) return
      await controls.start({ opacity: 0.08, transition: { duration: 0.06 } })
      if (!mounted) return
      await controls.start({ opacity: 1, scale: 1, transition: { duration: 0.12 } })
      if (!mounted) return

      scheduleFlicker()
    }

    scheduleFlicker()
    return () => { mounted = false }
  }, [controls])

  return (
    <motion.div
      animate={controls}
      className="relative w-36 h-36 md:w-52 md:h-52"
      aria-hidden="true"
    >
      {/* Far gravitational lensing halos */}
      <div className="absolute rounded-full" style={{ inset: '-40px', border: '1px solid color-mix(in srgb, var(--accent) 3%, transparent)' }} />
      <div className="absolute rounded-full" style={{ inset: '-24px', border: '1px solid color-mix(in srgb, var(--accent) 5%, transparent)' }} />

      {/* Accretion disk — rotating conic ring, clipped by the event horizon above */}
      <div
        className="absolute rounded-full"
        style={{
          inset: '-14px',
          background: `conic-gradient(
            from 0deg,
            transparent 0deg,
            color-mix(in srgb, var(--accent) 6%, transparent) 40deg,
            color-mix(in srgb, var(--accent) 22%, transparent) 80deg,
            color-mix(in srgb, var(--accent) 42%, transparent) 105deg,
            color-mix(in srgb, var(--accent) 22%, transparent) 130deg,
            color-mix(in srgb, var(--accent) 5%, transparent) 170deg,
            transparent 210deg,
            color-mix(in srgb, var(--accent) 3%, transparent) 270deg,
            color-mix(in srgb, var(--accent) 7%, transparent) 310deg,
            color-mix(in srgb, var(--accent) 3%, transparent) 340deg,
            transparent 360deg
          )`,
          filter: 'blur(3px)',
          animation: 'disk-rotate 28s linear infinite',
        }}
      />

      {/* Event horizon — pure void, covers disk center */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: '#000000',
          boxShadow: [
            '0 0 0 1.5px color-mix(in srgb, var(--accent) 70%, transparent)',
            '0 0 6px 1px color-mix(in srgb, var(--accent) 35%, transparent)',
            '0 0 24px 4px color-mix(in srgb, var(--accent) 12%, transparent)',
            '0 0 60px 8px color-mix(in srgb, var(--accent) 5%, transparent)',
          ].join(', '),
        }}
      />

      {/* Doppler beaming — top of ring brighter (near side of disk) */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: '-18px',
          background: 'radial-gradient(ellipse at 50% 8%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 55%)',
        }}
      />

      {/* Distant pulse ring */}
      <div
        className="absolute rounded-full border border-void-teal/10"
        style={{ inset: '-8px', animation: 'eclipse-pulse 5s ease-in-out infinite' }}
      />

      {/* Mount sweep — scan line crosses once on load */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        <motion.div
          className="absolute left-0 right-0 h-px bg-void-teal/30"
          initial={{ top: '-2px' }}
          animate={{ top: '102%' }}
          transition={{ duration: 1.6, ease: 'easeIn', delay: 0.3 }}
        />
      </div>
    </motion.div>
  )
}
