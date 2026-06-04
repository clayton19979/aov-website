'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'void' | 'crimson' | 'spectre' | 'abyssal'
export type CursorStyle = 'orbit' | 'cross' | 'blade' | 'dot'

export const THEMES: { id: Theme; label: string; accent: string }[] = [
  { id: 'void',    label: 'VOID',    accent: '#00b4d8' },
  { id: 'abyssal', label: 'ABYSSAL', accent: '#00ffe5' },
  { id: 'crimson', label: 'CRIMSON', accent: '#ff2251' },
  { id: 'spectre', label: 'SPECTRE', accent: '#c084fc' },
]

export const CURSORS: { id: CursorStyle; label: string; icon: string }[] = [
  { id: 'orbit', label: 'ORBIT', icon: '◎' },
  { id: 'cross', label: 'CROSS', icon: '✛' },
  { id: 'blade', label: 'BLADE', icon: '◆' },
  { id: 'dot',   label: 'DOT',   icon: '·' },
]

function buildCursorSVG(accent: string, style: CursorStyle): string {
  const c = accent.replace('#', '%23')

  let shapes = ''
  switch (style) {
    case 'orbit':
      shapes = `<circle cx='16' cy='16' r='14' fill='none' stroke='${c}' stroke-width='1' opacity='.40'/><circle cx='16' cy='16' r='9' fill='none' stroke='${c}' stroke-width='1.5' opacity='.70'/><circle cx='16' cy='16' r='3' fill='${c}'/>`
      break
    case 'cross':
      shapes = `<line x1='2' y1='16' x2='11' y2='16' stroke='${c}' stroke-width='1.5' opacity='.8'/><line x1='21' y1='16' x2='30' y2='16' stroke='${c}' stroke-width='1.5' opacity='.8'/><line x1='16' y1='2' x2='16' y2='11' stroke='${c}' stroke-width='1.5' opacity='.8'/><line x1='16' y1='21' x2='16' y2='30' stroke='${c}' stroke-width='1.5' opacity='.8'/><circle cx='16' cy='16' r='2' fill='${c}'/>`
      break
    case 'blade':
      shapes = `<polygon points='16,3 29,16 16,29 3,16' fill='none' stroke='${c}' stroke-width='1' opacity='.5'/><circle cx='16' cy='16' r='2.5' fill='${c}'/>`
      break
    case 'dot':
      shapes = `<circle cx='16' cy='16' r='13' fill='none' stroke='${c}' stroke-width='.75' opacity='.2'/><circle cx='16' cy='16' r='4' fill='${c}'/>`
      break
  }

  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>${shapes}</svg>`
}

function applyCursor(accent: string, style: CursorStyle) {
  const uri = buildCursorSVG(accent, style)
  const rule = `url("${uri}") 16 16, crosshair`

  let el = document.getElementById('aov-cursor-style') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'aov-cursor-style'
    document.head.appendChild(el)
  }
  el.textContent = [
    `html,body{cursor:${rule}}`,
    `a,button,[role="button"],input[type="submit"],input[type="button"],input[type="reset"],label[for],select{cursor:inherit}`,
    `input[type="text"],input[type="email"],input[type="password"],input[type="search"],input[type="number"],textarea{cursor:text}`,
  ].join('')
}

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  cursorStyle: CursorStyle
  setCursorStyle: (c: CursorStyle) => void
}>({
  theme: 'void',
  setTheme: () => {},
  cursorStyle: 'orbit',
  setCursorStyle: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('void')
  const [cursorStyle, setCursorState] = useState<CursorStyle>('orbit')

  // Restore persisted preferences and apply cursor on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('aov-theme') as Theme | null
    const savedCursor = localStorage.getItem('aov-cursor') as CursorStyle | null

    const t = savedTheme && THEMES.find(x => x.id === savedTheme) ? savedTheme : 'void'
    const cs = savedCursor && CURSORS.find(x => x.id === savedCursor) ? savedCursor : 'orbit'

    setThemeState(t)
    setCursorState(cs)

    const accent = THEMES.find(x => x.id === t)!.accent
    applyCursor(accent, cs)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('aov-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    applyCursor(THEMES.find(x => x.id === t)!.accent, cursorStyle)
  }

  function setCursorStyle(cs: CursorStyle) {
    setCursorState(cs)
    localStorage.setItem('aov-cursor', cs)
    const accent = THEMES.find(x => x.id === theme)!.accent
    applyCursor(accent, cs)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cursorStyle, setCursorStyle }}>
      {children}
    </ThemeContext.Provider>
  )
}
