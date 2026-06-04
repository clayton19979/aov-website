'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  title: string
  description: string
  index: number
}

export function OperationCard({ title, description, index }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.08 + index * 0.07 }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`group relative border border-dashed overflow-hidden p-6 transition-all duration-500 ${
          hovered
            ? 'border-void-teal/25 opacity-75'
            : 'border-void-teal/10 opacity-50'
        }`}
      >
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-void-teal opacity-0 group-hover:opacity-30 transition-opacity duration-300" />

        {/* HUD corner brackets — converge inward on hover */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className={`absolute h-2.5 w-2.5 border-t border-l border-void-teal transition-all duration-300 ${hovered ? 'opacity-70 top-2 left-2' : 'opacity-0 top-1 left-1'}`} />
          <span className={`absolute h-2.5 w-2.5 border-t border-r border-void-teal transition-all duration-300 ${hovered ? 'opacity-70 top-2 right-2' : 'opacity-0 top-1 right-1'}`} />
          <span className={`absolute h-2.5 w-2.5 border-b border-l border-void-teal transition-all duration-300 ${hovered ? 'opacity-70 bottom-2 left-2' : 'opacity-0 bottom-1 left-1'}`} />
          <span className={`absolute h-2.5 w-2.5 border-b border-r border-void-teal transition-all duration-300 ${hovered ? 'opacity-70 bottom-2 right-2' : 'opacity-0 bottom-1 right-1'}`} />
        </div>

        {/* Scan line — sweeps top→bottom on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key="scan"
              className="absolute left-0 right-0 h-px pointer-events-none z-10"
              style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent)' }}
              initial={{ top: '-1px' }}
              animate={{ top: '100%' }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.5, ease: 'easeIn' }}
            />
          )}
        </AnimatePresence>

        <h3 className="font-mono text-xs tracking-widest uppercase text-void-teal/60 mb-2">
          {title}
        </h3>
        <p className="font-mono text-xs text-white/25 leading-relaxed tracking-wide">
          {description}
        </p>
        <p className="mt-4 flex items-center gap-2 font-mono text-xs text-white/15 group-hover:text-white/30 tracking-widest uppercase transition-colors duration-500">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-void-teal"
            style={{ animation: `status-pulse 2.6s ease-in-out ${index * 0.35}s infinite` }}
            aria-hidden="true"
          />
          Standby
        </p>
      </div>
    </motion.div>
  )
}
