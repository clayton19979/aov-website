import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PhraseCycler } from './PhraseCycler'

describe('PhraseCycler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('exposes the current phrase to assistive tech from the first render', () => {
    render(<PhraseCycler />)
    const el = screen.getByRole('status')
    expect(el.textContent).toBeTruthy()
  })

  it('types the phrase out one character at a time', async () => {
    render(<PhraseCycler />)
    const el = screen.getByRole('status')
    // The visible (aria-hidden) typed span starts empty, before the caret/sr text.
    const typed = () => el.querySelector('span')?.textContent ?? ''
    expect(typed()).toBe('')

    await act(async () => { vi.advanceTimersByTime(60) })
    expect(typed().length).toBe(1)

    await act(async () => { vi.advanceTimersByTime(60) })
    expect(typed().length).toBe(2)
  })

  it('cycles to a new phrase after typing, holding, and erasing', async () => {
    render(<PhraseCycler />)
    const initial = screen.getByRole('status').textContent

    // Advance well past a full type → hold → erase → next cycle.
    await act(async () => { vi.advanceTimersByTime(8000) })

    const after = screen.getByRole('status').textContent
    expect(after).not.toBe(initial)
  })
})
