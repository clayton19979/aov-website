import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGlitchText } from './useGlitchText'

describe('useGlitchText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the original text initially', () => {
    const { result } = renderHook(() => useGlitchText('ARCHITECTS OF THE VOID'))
    expect(result.current.displayed).toBe('ARCHITECTS OF THE VOID')
    expect(result.current.isGlitching).toBe(false)
  })

  it('corrupts text during glitch window', () => {
    const { result } = renderHook(() => useGlitchText('ARCHITECTS OF THE VOID'))

    act(() => {
      vi.advanceTimersByTime(9000) // past max 8s delay
    })

    // After corruption + recovery it should be back to original
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.displayed).toBe('ARCHITECTS OF THE VOID')
    expect(result.current.isGlitching).toBe(false)
  })

  it('preserves spaces during corruption', () => {
    const { result } = renderHook(() => useGlitchText('A B C'))

    // Force glitch by advancing well past the max delay
    act(() => {
      vi.advanceTimersByTime(9000)
    })

    // After recovery, spaces must still be spaces
    const chars = result.current.displayed.split('')
    expect(chars[1]).toBe(' ')
    expect(chars[3]).toBe(' ')
  })
})
