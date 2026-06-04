'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { LoginButton } from '@/components/auth/LoginButton'

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number], delay },
  }
}

export function LoginContent() {
  return (
    <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-md">
      <motion.div {...fadeUp(0)} className="font-mono text-sm tracking-widest text-void-teal">
        ◈ AoV
      </motion.div>

      <motion.div {...fadeUp(0.12)} className="flex flex-col gap-3">
        <h1 className="font-mono text-2xl tracking-widest uppercase text-white/90">
          Member Access
        </h1>
        <p className="font-mono text-xs tracking-widest text-void-teal/60 italic">
          &quot;AUREX does not promote. AUREX recognizes.&quot;
        </p>
      </motion.div>

      <motion.p {...fadeUp(0.24)} className="font-mono text-xs tracking-wide text-white/20 leading-relaxed uppercase">
        Connect your EVE Vault wallet to verify membership in the Architects of the Void.
        Only characters belonging to the order may enter.
      </motion.p>

      <motion.div {...fadeUp(0.36)}>
        <Suspense>
          <LoginButton />
        </Suspense>
      </motion.div>

      <motion.div {...fadeUp(0.48)}>
        <Link
          href="/"
          className="font-mono text-xs tracking-widest uppercase text-white/15 hover:text-white/30 transition-colors"
        >
          ← Return
        </Link>
      </motion.div>
    </div>
  )
}
