'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DesignationNode } from '@/data/designations'

export function DesignationNodeCard({ node }: { node: DesignationNode }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="w-full text-left border border-void-teal/10 hover:border-void-teal/30 bg-void-teal/5 p-4 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-void-teal/30"
      aria-expanded={expanded}
      aria-controls={`node-detail-${node.name.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-void-teal">
            {node.name}
          </p>
          <p className="font-mono text-xs text-white/30 tracking-wide mt-1 uppercase">
            {node.domain}
          </p>
        </div>
        <motion.span
          className="font-mono text-xs text-void-teal/40 shrink-0 mt-0.5"
          animate={{ rotate: expanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
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
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="mt-4 font-mono text-xs text-white/40 leading-relaxed tracking-wide border-t border-void-teal/10 pt-4">
              {node.detail}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
