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

// HUD targeting frame: L-shaped brackets anchored at the four hero corners.
const FRAME_CORNERS = [
  { key: 'tl', pos: 'top-4 left-4 md:top-6 md:left-6', borders: 'border-t border-l' },
  { key: 'tr', pos: 'top-4 right-4 md:top-6 md:right-6', borders: 'border-t border-r' },
  { key: 'bl', pos: 'bottom-16 left-4 md:bottom-16 md:left-6', borders: 'border-b border-l' },
  { key: 'br', pos: 'bottom-16 right-4 md:bottom-16 md:right-6', borders: 'border-b border-r' },
] as const

export function LandingHero() {
  const { displayed, isGlitching } = useGlitchText('ARCHITECTS OF THE VOID')
  const [memberHovered, setMemberHovered] = useState(false)

  return (
    <section
      aria-labelledby="landing-title"
      className={`relative flex min-h-[92svh] flex-col items-center justify-center overflow-hidden bg-void-black ${isGlitching ? 'noise-flash' : ''}`}
    >
      <StarField />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--accent) 4%, transparent) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        {FRAME_CORNERS.map((c, i) => (
          <motion.span
            key={c.key}
            className={`absolute h-6 w-6 md:h-8 md:w-8 ${c.pos} ${c.borders}`}
            style={{
              borderColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
              filter: 'drop-shadow(0 0 3px color-mix(in srgb, var(--accent) 18%, transparent))',
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.6 + i * 0.1 }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center sm:gap-8">
        <motion.div {...fadeUp(0)}>
          <VoidEclipse />
        </motion.div>

        <motion.div {...fadeUp(0.12)} className="flex flex-col items-center gap-3">
          <h1
            id="landing-title"
            className={`glitch-title font-mono text-4xl tracking-widest uppercase text-white/90 md:text-6xl lg:text-7xl ${isGlitching ? 'is-glitching' : ''}`}
          >
            {displayed}
          </h1>
          <p className="font-mono text-sm tracking-widest text-void-teal/60 italic">
            &ldquo;We were not chosen. We survived.&rdquo;
          </p>
        </motion.div>

        <motion.p {...fadeUp(0.24)} className="max-w-sm font-mono text-xs tracking-wide text-white/20 leading-relaxed uppercase">
          A militant techno-religious order operating at the edge of civilization.
          We do not recruit. We recognize.
        </motion.p>

        <motion.div {...fadeUp(0.36)}>
          <DiscordCTA />
        </motion.div>

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
            <span aria-hidden="true">&#9672;</span>
            <span>Member Access</span>
          </Link>
        </motion.div>
      </div>

      <footer className="absolute bottom-0 inset-x-0 flex items-center justify-between border-t border-void-teal/10 px-6 py-3">
        <span className="font-mono text-xs tracking-widest text-white/10 uppercase">
          &#9672; AoV
        </span>
        <PhraseCycler />
        <span className="font-mono text-xs text-white/10" aria-hidden="true">&#9672;</span>
      </footer>
    </section>
  )
}
