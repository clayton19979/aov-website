'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { StarField } from '@/components/landing/StarField'
import { VoidEclipse } from '@/components/landing/VoidEclipse'
import { DiscordCTA } from '@/components/landing/DiscordCTA'
import { PhraseCycler } from '@/components/landing/PhraseCycler'
import { useGlitchText } from '@/hooks/useGlitchText'

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number], delay },
  }
}

export default function LandingPage() {
  const { displayed, isGlitching } = useGlitchText('ARCHITECTS OF THE VOID')
  const [memberHovered, setMemberHovered] = useState(false)

  return (
    <main
      className={`relative flex flex-col items-center justify-center min-h-screen bg-void-black overflow-hidden ${isGlitching ? 'noise-flash' : ''}`}
    >
      {/* Background star field */}
      <StarField />

      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(0,180,216,0.04) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        {/* Eclipse */}
        <motion.div {...fadeUp(0)}>
          <VoidEclipse />
        </motion.div>

        {/* Title */}
        <motion.div {...fadeUp(0.12)} className="flex flex-col items-center gap-3">
          <h1
            className={`glitch-title font-mono text-4xl md:text-6xl lg:text-7xl tracking-widest uppercase text-white/90 ${isGlitching ? 'is-glitching' : ''}`}
          >
            {displayed}
          </h1>
          <p className="font-mono text-sm tracking-widest text-void-teal/60 italic">
            &ldquo;We were not chosen. We survived.&rdquo;
          </p>
        </motion.div>

        {/* Description */}
        <motion.p {...fadeUp(0.24)} className="max-w-sm font-mono text-xs tracking-wide text-white/20 leading-relaxed uppercase">
          A militant techno-religious order operating at the edge of civilization.
          We do not recruit. We recognize.
        </motion.p>

        {/* Discord CTA */}
        <motion.div {...fadeUp(0.36)}>
          <DiscordCTA />
        </motion.div>

        {/* Member access */}
        <motion.div {...fadeUp(0.48)}>
          <Link
            href="/login"
            onMouseEnter={() => setMemberHovered(true)}
            onMouseLeave={() => setMemberHovered(false)}
            className="inline-flex items-center gap-2 border px-6 py-2 font-mono text-xs tracking-widest uppercase transition-all duration-300"
            style={{
              borderColor: memberHovered
                ? 'color-mix(in srgb, var(--accent) 50%, transparent)'
                : 'color-mix(in srgb, var(--accent) 20%, transparent)',
              color: memberHovered
                ? 'var(--accent)'
                : 'color-mix(in srgb, var(--accent) 50%, transparent)',
              boxShadow: memberHovered
                ? '0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent), 0 0 18px 4px color-mix(in srgb, var(--accent) 10%, transparent)'
                : '0 0 10px 1px color-mix(in srgb, var(--accent) 5%, transparent)',
              transition: 'border-color 300ms ease, color 300ms ease, box-shadow 350ms ease',
            }}
          >
            ◈ Member Access
          </Link>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <footer className="absolute bottom-0 inset-x-0 flex items-center justify-between px-6 py-3 border-t border-void-teal/10">
        <span className="font-mono text-xs tracking-widest text-white/10 uppercase">
          ◈ AoV
        </span>
        <PhraseCycler />
        <span className="font-mono text-xs text-white/10">◈</span>
      </footer>
    </main>
  )
}
