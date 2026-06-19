import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkipToMainContent } from './SkipToMainContent'

describe('SkipToMainContent', () => {
  it('provides a keyboard skip link to the main content target', () => {
    render(
      <SkipToMainContent>
        <main>Command content</main>
      </SkipToMainContent>,
    )

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(document.getElementById('main-content')).toHaveTextContent('Command content')
  })
})
