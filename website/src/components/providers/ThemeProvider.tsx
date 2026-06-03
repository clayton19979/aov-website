'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'void' | 'solar'

const ThemeContext = createContext<{
  theme: Theme
  toggle: () => void
}>({ theme: 'void', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('void')

  useEffect(() => {
    const saved = localStorage.getItem('aov-theme') as Theme | null
    if (saved === 'void' || saved === 'solar') {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const toggle = () => {
    setTheme(prev => {
      const next = prev === 'void' ? 'solar' : 'void'
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem('aov-theme', next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
