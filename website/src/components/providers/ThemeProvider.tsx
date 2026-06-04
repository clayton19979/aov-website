'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'void' | 'crimson' | 'spectre' | 'abyssal'

export const THEMES: { id: Theme; label: string; accent: string }[] = [
  { id: 'void',    label: 'VOID',    accent: '#00b4d8' },
  { id: 'abyssal', label: 'ABYSSAL', accent: '#00ffe5' },
  { id: 'crimson', label: 'CRIMSON', accent: '#ff2251' },
  { id: 'spectre', label: 'SPECTRE', accent: '#c084fc' },
]

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({
  theme: 'void',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('void')

  useEffect(() => {
    const saved = localStorage.getItem('aov-theme') as Theme | null
    if (saved && THEMES.find(t => t.id === saved)) {
      setThemeState(saved)
    }
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('aov-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
