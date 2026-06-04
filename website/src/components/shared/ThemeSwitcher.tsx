'use client'

import { useRef, useState, useEffect } from 'react'
import { useTheme, THEMES } from '@/components/providers/ThemeProvider'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = THEMES.find(t => t.id === theme) ?? THEMES[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-white/30 hover:text-white/60 transition-colors"
      >
        <span
          className="w-1.5 h-1.5 rounded-sm"
          style={{ backgroundColor: current.accent }}
        />
        {current.label}
        <span className="text-white/20">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[7rem] border border-white/10 bg-void-black/95 backdrop-blur-sm">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-1.5 font-mono text-xs tracking-widest transition-colors hover:bg-white/5"
              style={{ color: theme === t.id ? t.accent : 'rgba(255,255,255,0.4)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor: t.accent,
                  opacity: theme === t.id ? 1 : 0.35,
                }}
              />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
