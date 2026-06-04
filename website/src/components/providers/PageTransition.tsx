'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {children}
      </motion.div>

      {/* Scan-line sweep on every navigation — theme-aware accent line */}
      <motion.div
        key={`scan-${pathname}`}
        className="fixed top-0 inset-x-0 h-px pointer-events-none z-[9998]"
        style={{
          background: 'color-mix(in srgb, var(--accent) 55%, transparent)',
          boxShadow: '0 0 8px 2px color-mix(in srgb, var(--accent) 40%, transparent)',
        }}
        initial={{ y: '-1px' }}
        animate={{ y: '100vh' }}
        transition={{ duration: 0.5, ease: 'linear' }}
      />
    </>
  )
}
