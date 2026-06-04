import { Metadata } from 'next'
import { StarField } from '@/components/landing/StarField'
import { LoginContent } from '@/components/auth/LoginContent'

export const metadata: Metadata = {
  title: 'Access — Architects of the Void',
}

export default function LoginPage() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-void-black overflow-hidden">
      {/* Background star field */}
      <StarField />

      {/* Radial glow — theme-aware, slow ambient breathing */}
      <div
        className="login-portal-glow absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />

      <LoginContent />

      {/* Bottom bar */}
      <footer className="absolute bottom-0 inset-x-0 flex items-center justify-between px-6 py-3 border-t border-void-teal/10">
        <span className="font-mono text-xs tracking-widest text-white/10 uppercase">◈ AoV</span>
        <span className="font-mono text-xs text-white/10">Wallet authentication required</span>
        <span className="font-mono text-xs text-white/10">◈</span>
      </footer>
    </main>
  )
}
