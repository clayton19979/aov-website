'use client'

import { motion } from 'framer-motion'
import { TOOL_CATEGORIES } from '@/data/tools'
import type { Tool } from '@/data/tools'
import { ToolCard } from './ToolCard'

type Props = {
  tools: Tool[]
}

export function ToolGrid({ tools }: Props) {
  const categories = TOOL_CATEGORIES.filter(cat =>
    tools.some(t => t.category === cat)
  )

  let cardIndex = 0

  return (
    <div className="flex flex-col gap-10">
      {categories.map((category, catIndex) => {
        const categoryTools = tools.filter(t => t.category === category)
        return (
          <motion.section
            key={category}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: catIndex * 0.07, ease: 'easeOut' }}
          >
            <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal/40 mb-4 pb-2 border-b border-void-teal/10">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryTools.map(tool => {
                const delay = cardIndex++ * 0.06
                return (
                  <motion.div
                    key={tool.slug}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay, ease: 'easeOut' }}
                  >
                    <ToolCard tool={tool} />
                  </motion.div>
                )
              })}
            </div>
          </motion.section>
        )
      })}
    </div>
  )
}
