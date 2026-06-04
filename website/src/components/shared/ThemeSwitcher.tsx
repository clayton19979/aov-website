'use client'

import { useTheme, THEMES } from '@/components/providers/ThemeProvider'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1.5" title="Theme">
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          aria-label={t.label}
          title={t.label}
          className="w-2.5 h-2.5 rounded-sm transition-all duration-200 hover:scale-125"
          style={{
            backgroundColor: t.accent,
            opacity: theme === t.id ? 1 : 0.25,
            boxShadow: theme === t.id ? `0 0 8px ${t.accent}cc, 0 0 2px ${t.accent}` : 'none',
          }}
        />
      ))}
    </div>
  )
}
