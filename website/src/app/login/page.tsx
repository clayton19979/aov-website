import { Metadata } from 'next'
import Link from 'next/link'
import { LoginButton } from '@/components/auth/LoginButton'

export const metadata: Metadata = {
  title: 'Access — Architects of the Void',
}

export default function LoginPage() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-void-black">
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(0,180,216,0.04) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-md">
        {/* Mark */}
        <div className="font-mono text-sm tracking-widest text-void-teal">◈ AoV</div>

        {/* Heading */}
        <div className="flex flex-col gap-3">
          <h1 className="font-mono text-2xl tracking-widest uppercase text-white/90">
            Member Access
          </h1>
          <p className="font-mono text-xs tracking-widest text-void-teal/60 italic">
            &quot;AUREX does not promote. AUREX recognizes.&quot;
          </p>
        </div>

        {/* Description */}
        <p className="font-mono text-xs tracking-wide text-white/20 leading-relaxed uppercase">
          Connect your EVE Vault wallet to verify membership in the Architects of the Void.
          Only characters belonging to the order may enter.
        </p>

        {/* Connect button */}
        <LoginButton />

        {/* Back to landing */}
        <Link
          href="/"
          className="font-mono text-xs tracking-widest uppercase text-white/15 hover:text-white/30 transition-colors"
        >
          ← Return
        </Link>
      </div>

      {/* Bottom bar */}
      <footer className="absolute bottom-0 inset-x-0 flex items-center justify-between px-6 py-3 border-t border-void-teal/10">
        <span className="font-mono text-xs tracking-widest text-white/10 uppercase">◈ AoV</span>
        <span className="font-mono text-xs text-white/10">Wallet authentication required</span>
        <span className="font-mono text-xs text-white/10">◈</span>
      </footer>
    </main>
  )
}
