import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BackLink } from './BackLink'

describe('BackLink', () => {
  it('renders the label', () => {
    render(<BackLink href="/hub" label="HUB" />)
    expect(screen.getByRole('link', { name: /hub/i })).toBeInTheDocument()
  })

  it('links to the correct href', () => {
    render(<BackLink href="/hub" label="HUB" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/hub')
  })
})
