'use client'

import { useTheme } from '@/components/providers/ThemeProvider'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="font-mono text-xs tracking-widest text-void-teal/40 hover:text-void-teal transition-colors duration-200 uppercase"
      aria-label={`Switch to ${theme === 'void' ? 'solar' : 'void'} mode`}
    >
      {theme === 'void' ? '◉ VOID' : '◎ SOLAR'}
    </button>
  )
}
