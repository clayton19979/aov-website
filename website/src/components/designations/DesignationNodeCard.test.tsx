import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DesignationNodeCard } from './DesignationNodeCard'
import type { DesignationNode } from '@/data/designations'

const node: DesignationNode = {
  name: 'THE WARDEN',
  domain: 'Combat · Purification · Fleet Operations',
  description: 'Directs combat and enforcement.',
  detail:
    'Responsible for Purification campaigns, fleet command, and enforcement of doctrine through force.',
}

describe('DesignationNodeCard', () => {
  it('exposes a stable disclosure relationship for assistive tech', () => {
    render(<DesignationNodeCard node={node} />)

    const disclosure = screen.getByRole('button', { name: /the warden/i })

    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    expect(disclosure).toHaveAttribute('aria-controls', 'node-detail-the-warden')
    expect(screen.queryByRole('region', { name: /the warden details/i })).not.toBeInTheDocument()

    fireEvent.click(disclosure)

    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    const detailRegion = screen.getByRole('region', { name: /the warden details/i })
    expect(detailRegion).toHaveAttribute('id', 'node-detail-the-warden')
    expect(detailRegion).toHaveTextContent(node.detail)
    expect(disclosure).not.toContainElement(detailRegion)
  })
})
