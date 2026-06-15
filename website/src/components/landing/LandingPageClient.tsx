'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { StarField } from '@/components/landing/StarField'
import { VoidEclipse } from '@/components/landing/VoidEclipse'
import { DiscordCTA } from '@/components/landing/DiscordCTA'
import { PhraseCycler } from '@/components/landing/PhraseCycler'
import { useGlitchText } from '@/hooks/useGlitchText'
import type { recognitionBrief } from '@/data/recognition'

type LandingPageClientProps = {
  publicAxioms: readonly string[]
  recognition: typeof recognitionBrief
}

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number], delay },
  }
}

// HUD targeting frame: L-shaped brackets anchored at the four hero corners.
// Each draws from two borders; the top pair sits below the gutter, the bottom
// pair rides above the footer strip so the whole hero reads as a cockpit display.
const FRAME_CORNERS = [
  { key: 'tl', pos: 'top-4 left-4 md:top-6 md:left-6', borders: 'border-t border-l' },
  { key: 'tr', pos: 'top-4 right-4 md:top-6 md:right-6', borders: 'border-t border-r' },
  { key: 'bl', pos: 'bottom-16 left-4 md:bottom-16 md:left-6', borders: 'border-b border-l' },
  { key: 'br', pos: 'bottom-16 right-4 md:bottom-16 md:right-6', borders: 'border-b border-r' },
] as const

export function LandingPageClient({ publicAxioms, recognition }: LandingPageClientProps) {
  const { displayed, isGlitching } = useGlitchText('ARCHITECTS OF THE VOID')
  const [memberHovered, setMemberHovered] = useState(false)

  return (
    <main
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-void-black ${isGlitching ? 'noise-flash' : ''}`}
    >
      <StarField />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--accent) 4%, transparent) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        {FRAME_CORNERS.map((corner, index) => (
          <motion.span
            key={corner.key}
            className={`absolute h-6 w-6 md:h-8 md:w-8 ${corner.pos} ${corner.borders}`}
            style={{
              borderColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
              filter: 'drop-shadow(0 0 3px color-mix(in srgb, var(--accent) 18%, transparent))',
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.6 + index * 0.1 }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <motion.div {...fadeUp(0)}>
          <VoidEclipse />
        </motion.div>

        <motion.div {...fadeUp(0.12)} className="flex flex-col items-center gap-3">
          <h1
            className={`glitch-title font-mono text-4xl tracking-widest text-white/90 uppercase md:text-6xl lg:text-7xl ${isGlitching ? 'is-glitching' : ''}`}
          >
            {displayed}
          </h1>
          <p className="font-mono text-sm tracking-widest text-void-teal/60 italic">
            &ldquo;We were not chosen. We survived.&rdquo;
          </p>
        </motion.div>

        <motion.p
          {...fadeUp(0.24)}
          className="max-w-sm font-mono text-xs leading-relaxed tracking-wide text-white/20 uppercase"
        >
          A militant techno-religious order operating at the edge of civilization.
          We do not recruit. We recognize.
        </motion.p>

        <motion.section
          {...fadeUp(0.3)}
          aria-label="Public doctrine preview"
          className="w-full max-w-xl border border-void-teal/10 bg-white/[0.02] px-4 py-4 text-left backdrop-blur-sm"
        >
          <p className="mb-3 font-mono text-[10px] tracking-[0.35em] text-void-teal/55 uppercase">
            Public Doctrine Preview
          </p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {publicAxioms.map((axiom, index) => (
              <li
                key={axiom}
                className="border border-white/5 px-3 py-2 font-mono text-[11px] leading-relaxed tracking-wide text-white/45"
              >
                <span className="mr-2 text-void-teal/45">{String(index + 1).padStart(2, '0')}</span>
                {axiom}
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          {...fadeUp(0.36)}
          aria-label={`${recognition.eyebrow}: how the order selects`}
          className="w-full max-w-xl border border-void-teal/10 bg-white/[0.02] px-4 py-4 text-left backdrop-blur-sm"
        >
          <p className="mb-1 font-mono text-[10px] tracking-[0.35em] text-void-teal/55 uppercase">
            {recognition.eyebrow}
          </p>
          <h2 className="mb-3 font-mono text-sm leading-snug tracking-wide text-white/70 uppercase">
            {recognition.title}
          </h2>
          <ol className="grid gap-2 sm:grid-cols-3">
            {recognition.signals.map(signal => (
              <li
                key={signal.step}
                className="flex flex-col gap-1 border border-white/5 px-3 py-2"
              >
                <span className="font-mono text-[10px] tracking-[0.3em] text-void-teal/45 uppercase">
                  {signal.step} · {signal.title}
                </span>
                <span className="font-mono text-[11px] leading-relaxed tracking-wide text-white/45">
                  {signal.body}
                </span>
                <span className="mt-auto font-mono text-[10px] tracking-wide text-void-teal/50 italic">
                  {signal.measure}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 border-t border-void-teal/10 pt-3 font-mono text-[11px] leading-relaxed tracking-wide text-white/30 italic">
            {recognition.publicSignal}
          </p>
        </motion.section>

        <motion.div {...fadeUp(0.42)}>
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
            Member Access
          </Link>
        </motion.div>
      </div>

      <footer className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-void-teal/10 px-6 py-3">
        <span className="font-mono text-xs tracking-widest text-white/10 uppercase">
          AoV
        </span>
        <PhraseCycler />
        <span className="font-mono text-xs text-white/10">+</span>
      </footer>
    </main>
  )
}
