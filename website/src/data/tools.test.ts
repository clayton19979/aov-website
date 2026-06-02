import { describe, it, expect } from 'vitest'
import { tools, TOOL_CATEGORIES } from './tools'

describe('tools data', () => {
  it('every tool has required fields', () => {
    for (const tool of tools) {
      expect(tool.slug).toBeTruthy()
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(TOOL_CATEGORIES).toContain(tool.category)
      expect(['live', 'coming-soon']).toContain(tool.status)
    }
  })

  it('all slugs are unique', () => {
    const slugs = tools.map(t => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has at least one live tool', () => {
    expect(tools.some(t => t.status === 'live')).toBe(true)
  })
})
