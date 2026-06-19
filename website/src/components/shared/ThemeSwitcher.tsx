'use client'

import { useRef, useState, useEffect } from 'react'
import { useTheme, THEMES, CURSORS } from '@/components/providers/ThemeProvider'

export function ThemeSwitcher() {
  const { theme, setTheme, cursorStyle, setCursorStyle } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentTheme = THEMES.find(t => t.id === theme) ?? THEMES[0]

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
        type="button"
        aria-label="Display preferences"
        aria-expanded={open}
        aria-controls="display-preferences-menu"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-white/30 hover:text-white/60 transition-colors"
      >
        <span
          className="w-1.5 h-1.5 rounded-sm"
          style={{
            backgroundColor: currentTheme.accent,
            boxShadow: `0 0 4px 1px ${currentTheme.accent}66`,
          }}
        />
        {currentTheme.label}
        <span className="text-white/20">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          id="display-preferences-menu"
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[8rem] bg-void-black/95 backdrop-blur-sm"
          style={{
            border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
            boxShadow: '0 0 24px 2px color-mix(in srgb, var(--accent) 7%, transparent)',
          }}
        >
          {/* Theme section */}
          <div className="px-3 pt-2 pb-1 font-mono text-[10px] tracking-widest text-white/20 uppercase">
            Theme
          </div>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-1.5 font-mono text-xs tracking-widest transition-colors hover:bg-white/5"
              style={{
                color: theme === t.id ? t.accent : 'rgba(255,255,255,0.4)',
                background: theme === t.id ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : undefined,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor: t.accent,
                  opacity: theme === t.id ? 1 : 0.35,
                  boxShadow: theme === t.id ? `0 0 5px 1px ${t.accent}55` : undefined,
                }}
              />
              {t.label}
            </button>
          ))}

          {/* Divider */}
          <div className="mx-3 my-1.5 border-t" style={{ borderColor: 'color-mix(in srgb, var(--accent) 12%, transparent)' }} />

          {/* Cursor section */}
          <div className="px-3 pb-1 font-mono text-[10px] tracking-widest text-white/20 uppercase">
            Cursor
          </div>
          {CURSORS.map(c => (
            <button
              key={c.id}
              onClick={() => { setCursorStyle(c.id); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-1.5 font-mono text-xs tracking-widest transition-colors hover:bg-white/5"
              style={{
                color: cursorStyle === c.id ? currentTheme.accent : 'rgba(255,255,255,0.4)',
                background: cursorStyle === c.id ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : undefined,
              }}
            >
              <span className="w-3 text-center flex-shrink-0 opacity-70">{c.icon}</span>
              {c.label}
            </button>
          ))}
          <div className="pb-1.5" />
        </div>
      )}
    </div>
  )
}
