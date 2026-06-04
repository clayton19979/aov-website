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

  it('cycles to a new phrase after the interval', async () => {
    render(<PhraseCycler />)
    const initial = screen.getByRole('status').textContent

    // Advance past the 7000ms interval so setVisible(false) fires and React
    // flushes the state update, registering the follow-up 300ms timeout.
    await act(async () => { vi.advanceTimersByTime(7001) })
    // Advance past the 300ms transition timeout to trigger the phrase swap.
    await act(async () => { vi.advanceTimersByTime(301) })

    const after = screen.getByRole('status').textContent
    expect(after).not.toBe(initial)
  })
})
