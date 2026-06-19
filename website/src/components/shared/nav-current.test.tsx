import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopBarNav } from './TopBarNav'
import { MobileNavStrip } from './MobileNavStrip'

const pathnameState = vi.hoisted(() => ({ value: '/tools/fuel-calculator' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameState.value,
}))

describe('shared navigation current state', () => {
  it('marks the active desktop navigation link for assistive tech', () => {
    render(<TopBarNav />)

    expect(screen.getByRole('link', { name: 'TOOLS' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'DOCTRINE' })).not.toHaveAttribute('aria-current')
  })

  it('marks the active mobile navigation link for assistive tech', () => {
    render(<MobileNavStrip />)

    expect(screen.getByRole('link', { name: 'TOOLS' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'DESIGNATIONS' })).not.toHaveAttribute('aria-current')
  })
})
