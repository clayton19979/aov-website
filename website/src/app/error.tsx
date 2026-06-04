'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { GlitchTitle } from '@/components/shared/GlitchTitle'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[AoV] Unhandled runtime error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-void-black flex flex-col items-center justify-center px-6 font-mono">
      <div className="max-w-md w-full border border-void-teal/20 bg-void-black/60 p-8 text-center space-y-6">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.3em] text-void-teal/60 uppercase">System Status</p>
          <GlitchTitle className="text-2xl tracking-[0.2em] text-void-teal uppercase">
            Signal Lost
          </GlitchTitle>
        </div>

        <div className="border-t border-void-teal/10 pt-6 space-y-2">
          <p className="text-xs tracking-widest text-white/40 uppercase">
            An unresolved fault has interrupted this node.
          </p>
          {error.digest && (
            <p className="text-xs text-white/20 tracking-widest">
              ref: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 text-xs tracking-[0.2em] uppercase border border-void-teal/40 text-void-teal hover:bg-void-teal/10 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/hub"
            className="flex-1 px-4 py-2 text-xs tracking-[0.2em] uppercase border border-white/15 text-white/40 hover:text-white/70 hover:border-white/30 transition-colors text-center"
          >
            Return to Hub
          </Link>
        </div>
      </div>
    </div>
  )
}
