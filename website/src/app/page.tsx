'use client'

import Link from 'next/link'
import { StarField } from '@/components/landing/StarField'
import { VoidEclipse } from '@/components/landing/VoidEclipse'
import { DiscordCTA } from '@/components/landing/DiscordCTA'
import { PhraseCycler } from '@/components/landing/PhraseCycler'
import { useGlitchText } from '@/hooks/useGlitchText'

export default function LandingPage() {
  const { displayed, isGlitching } = useGlitchText('ARCHITECTS OF THE VOID')

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
        <VoidEclipse />

        {/* Title */}
        <div className="flex flex-col items-center gap-3">
          <h1
            className={`glitch-title font-mono text-3xl md:text-4xl tracking-widest uppercase text-white/90 ${isGlitching ? 'is-glitching' : ''}`}
          >
            {displayed}
          </h1>
          <p className="font-mono text-sm tracking-widest text-void-teal/60 italic">
            "We were not chosen. We survived."
          </p>
        </div>

        {/* Description */}
        <p className="max-w-sm font-mono text-xs tracking-wide text-white/20 leading-relaxed uppercase">
          A militant techno-religious order operating at the edge of civilization.
          We do not recruit. We recognize.
        </p>

        {/* Discord CTA */}
        <DiscordCTA />

        {/* Member access */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 border border-void-teal/20 hover:border-void-teal/50 px-6 py-2 font-mono text-xs tracking-widest uppercase text-void-teal/50 hover:text-void-teal transition-all duration-300"
        >
          ◈ Member Access
        </Link>
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
