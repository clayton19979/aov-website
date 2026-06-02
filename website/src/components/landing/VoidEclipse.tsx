'use client'

import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'

export function VoidEclipse() {
  const controls = useAnimation()

  useEffect(() => {
    let mounted = true

    async function scheduleFlicker() {
      if (!mounted) return
      const delay = 6000 + Math.random() * 10000

      await new Promise(resolve => setTimeout(resolve, delay))
      if (!mounted) return

      await controls.start({ opacity: 0.05, transition: { duration: 0.05 } })
      if (!mounted) return
      await controls.start({ opacity: 1, transition: { duration: 0.07 } })
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
      {/* outer glow ring */}
      <div className="absolute inset-[-16px] rounded-full border border-void-teal/10" />
      {/* mid glow ring */}
      <div className="absolute inset-[-8px] rounded-full border border-void-teal/20" />
      {/* eclipse body */}
      <div
        className="absolute inset-0 rounded-full bg-void-black border border-void-teal/30"
        style={{
          boxShadow: '0 0 40px rgba(0,180,216,0.12), 0 0 80px rgba(0,180,216,0.06), inset 0 0 30px rgba(0,180,216,0.04)',
        }}
      />
      {/* inner gradient — gives depth */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 70% 30%, rgba(0,180,216,0.06) 0%, transparent 60%)',
        }}
      />
      {/* pulse animation ring */}
      <div
        className="absolute inset-[-4px] rounded-full border border-void-teal/15"
        style={{ animation: 'eclipse-pulse 4s ease-in-out infinite' }}
      />
    </motion.div>
  )
}
