import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HubQuadrant } from './HubQuadrant'

describe('HubQuadrant', () => {
  const props = {
    glyph: '⬡',
    title: 'TOOLS',
    description: 'Operational toolkit.',
    meta: '4 tools',
    href: '/tools',
  }

  it('renders the title', () => {
    render(<HubQuadrant {...props} />)
    expect(screen.getByText('⬡ TOOLS')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<HubQuadrant {...props} />)
    expect(screen.getByText('Operational toolkit.')).toBeInTheDocument()
  })

  it('links to the correct href', () => {
    render(<HubQuadrant {...props} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools')
  })
})
