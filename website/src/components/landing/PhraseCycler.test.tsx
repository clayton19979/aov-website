import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PhraseCycler } from './PhraseCycler'

describe('PhraseCycler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders an initial phrase', () => {
    render(<PhraseCycler />)
    const el = screen.getByRole('status')
    expect(el.textContent).toBeTruthy()
  })

  it('cycles to a new phrase after the interval', () => {
    render(<PhraseCycler />)
    const initial = screen.getByRole('status').textContent

    act(() => { vi.advanceTimersByTime(7500) })

    const after = screen.getByRole('status').textContent
    expect(after).not.toBe(initial)
  })
})
