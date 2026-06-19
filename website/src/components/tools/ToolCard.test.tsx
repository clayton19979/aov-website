import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolCard } from './ToolCard'
import type { Tool } from '@/data/tools'

const liveTool: Tool = {
  slug: 'fuel-calculator',
  name: 'Fuel Calculator',
  description: 'Optimize jump routes.',
  category: 'LOGISTICS',
  status: 'live',
}

const comingSoon: Tool = {
  slug: 'route-optimizer',
  name: 'Route Optimizer',
  description: 'Multi-jump planning.',
  category: 'LOGISTICS',
  status: 'coming-soon',
}

describe('ToolCard', () => {
  it('renders tool name and description', () => {
    render(<ToolCard tool={liveTool} />)
    expect(screen.getByText('Fuel Calculator')).toBeInTheDocument()
    expect(screen.getByText('Optimize jump routes.')).toBeInTheDocument()
  })

  it('live tool renders as a link', () => {
    render(<ToolCard tool={liveTool} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools/fuel-calculator')
  })

  it('uses the tool name as the accessible link name for live tools', () => {
    render(<ToolCard tool={liveTool} />)

    expect(screen.getByRole('link', { name: 'Fuel Calculator' })).toHaveAttribute(
      'href',
      '/tools/fuel-calculator',
    )
  })

  it('coming-soon tool is not a link', () => {
    render(<ToolCard tool={comingSoon} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders category badge', () => {
    render(<ToolCard tool={liveTool} />)
    expect(screen.getByText('LOGISTICS')).toBeInTheDocument()
  })
})
