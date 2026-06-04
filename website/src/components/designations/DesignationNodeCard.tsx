'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DesignationNode } from '@/data/designations'

export function DesignationNodeCard({ node }: { node: DesignationNode }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative w-full text-left p-4 focus:outline-none focus:ring-1 focus:ring-void-teal/30 overflow-hidden"
      style={{
        border: '1px solid',
        borderColor: hovered
          ? 'color-mix(in srgb, var(--accent) 30%, transparent)'
          : 'color-mix(in srgb, var(--accent) 10%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--accent) 5%, transparent)',
        transition: 'border-color 200ms',
      }}
      aria-expanded={expanded}
      aria-controls={`node-detail-${node.name.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {/* Left glow bar — appears when expanded */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ backgroundColor: 'var(--accent)' }}
        animate={{ opacity: expanded ? 0.55 : 0 }}
        transition={{ duration: 0.3 }}
      />
      {/* Ambient left halo — soft accent wash */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, color-mix(in srgb, var(--accent) 7%, transparent), transparent)' }}
        animate={{ opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* Scan-line — sweeps top→bottom on expand */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="scan"
            className="absolute left-0 right-0 h-px pointer-events-none z-10"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}
            initial={{ top: '-1px' }}
            animate={{ top: '100%' }}
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            transition={{ duration: 0.5, ease: 'easeIn' }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
            {node.name}
          </p>
          <p className="font-mono text-xs text-white/30 tracking-wide mt-1 uppercase">
            {node.domain}
          </p>
        </div>
        <motion.span
          className="font-mono text-xs shrink-0 mt-0.5 transition-colors duration-200"
          style={{
            color: expanded
              ? 'color-mix(in srgb, var(--accent) 70%, transparent)'
              : 'color-mix(in srgb, var(--accent) 40%, transparent)',
          }}
          animate={{ rotate: expanded ? 45 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          +
        </motion.span>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            id={`node-detail-${node.name.replace(/\s+/g, '-').toLowerCase()}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p
              className="mt-4 font-mono text-xs text-white/40 leading-relaxed tracking-wide pt-4"
              style={{ borderTop: '1px solid color-mix(in srgb, var(--accent) 10%, transparent)' }}
            >
              {node.detail}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
