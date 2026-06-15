import { describe, expect, it } from 'vitest'
import { recognitionBrief } from './recognition'

describe('recognition brief', () => {
  it('keeps the public filter explicit and compact', () => {
    expect(recognitionBrief.title).toContain('does not recruit')
    expect(recognitionBrief.publicSignal).toContain('encouragement')
    expect(recognitionBrief.signals).toHaveLength(3)
  })

  it('uses unique ordered signal steps', () => {
    const steps = recognitionBrief.signals.map(signal => signal.step)

    expect(steps).toEqual(['00', '01', '02'])
    expect(new Set(steps).size).toBe(steps.length)
  })
})
