import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeSwitcher } from './ThemeSwitcher'

function renderThemeSwitcher() {
  render(
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>
  )
}

describe('ThemeSwitcher', () => {
  it('exposes the preference trigger as a named expanded menu button', () => {
    renderThemeSwitcher()

    const trigger = screen.getByRole('button', { name: /display preferences/i })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', 'display-preferences-menu')

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
})
