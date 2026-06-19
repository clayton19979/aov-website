import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkTribeMembership, getTribeName } from './tribe'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal GraphQL response for a verified AoV member */
function makeVerifiedPayload(characterName = 'TestPilot', tribeId = 1000167, characterId = 42) {
  return {
    data: {
      address: {
        objects: {
          nodes: [
            {
              contents: {
                extract: {
                  asAddress: {
                    asObject: {
                      asMoveObject: {
                        contents: {
                          type: { repr: 'PlayerProfile' },
                          json: {
                            metadata: { name: characterName },
                            tribe_id: tribeId,
                            key: { item_id: characterId },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
  }
}

/** Minimal GraphQL response for an empty wallet (no character) */
const EMPTY_WALLET_PAYLOAD = {
  data: { address: { objects: { nodes: [] } } },
}

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(payload),
    }),
  )
}

function mockFetchNetworkError(message = 'Network error') {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(message)))
}

function mockFetchTimeout() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        // Immediately abort if an AbortSignal is provided
        const signal = init?.signal
        if (signal) {
          if (signal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
            return
          }
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }
        // Otherwise hang forever (no resolve/reject) — the signal will abort it
      })
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// getTribeName
// ---------------------------------------------------------------------------

describe('getTribeName', () => {
  it('returns the known name for tribe 1000167', () => {
    expect(getTribeName(1000167)).toBe('Architects of the Void')
  })

  it('falls back to a generic label for unknown tribe IDs', () => {
    expect(getTribeName(9999)).toBe('Tribe 9999')
  })
})

// ---------------------------------------------------------------------------
// checkTribeMembership — success paths
// ---------------------------------------------------------------------------

describe('checkTribeMembership — success paths', () => {
  it('returns verified for an AoV member wallet', async () => {
    mockFetch(makeVerifiedPayload('Archon Zero', 1000167, 1))

    const result = await checkTribeMembership('0xabc123')

    expect(result.status).toBe('verified')
    if (result.status !== 'verified') return
    expect(result.characterName).toBe('Archon Zero')
    expect(result.tribeId).toBe(1000167)
    expect(result.tribeName).toBe('Architects of the Void')
    expect(result.characterId).toBe(1)
  })

  it('returns wrong-tribe when tribeId does not match', async () => {
    mockFetch(makeVerifiedPayload('Outsider', 999999, 7))

    const result = await checkTribeMembership('0xother')

    expect(result.status).toBe('wrong-tribe')
    if (result.status !== 'wrong-tribe') return
    expect(result.tribeId).toBe(999999)
    expect(result.characterName).toBe('Outsider')
  })

  it('returns no-character when the wallet has no character objects', async () => {
    mockFetch(EMPTY_WALLET_PAYLOAD)

    const result = await checkTribeMembership('0xempty')
    expect(result.status).toBe('no-character')
  })
})

// ---------------------------------------------------------------------------
// checkTribeMembership — error paths
// ---------------------------------------------------------------------------

describe('checkTribeMembership — error paths', () => {
  it('returns error when the GraphQL endpoint returns a non-2xx status', async () => {
    mockFetch({}, 503)

    const result = await checkTribeMembership('0xbad')

    expect(result.status).toBe('error')
    if (result.status !== 'error') return
    expect(result.message).toMatch(/GraphQL request failed: 503/)
  })

  it('returns error on a network-level failure', async () => {
    mockFetchNetworkError('Failed to fetch')

    const result = await checkTribeMembership('0xoffline')

    expect(result.status).toBe('error')
    if (result.status !== 'error') return
    expect(result.message).toContain('Failed to fetch')
  })

  it('returns a clear timeout error message when the request is aborted', async () => {
    vi.useFakeTimers()
    mockFetchTimeout()

    const promise = checkTribeMembership('0xslow')

    // Advance past the 10 s timeout constant
    vi.advanceTimersByTime(11_000)

    const result = await promise

    vi.useRealTimers()

    expect(result.status).toBe('error')
    if (result.status !== 'error') return
    expect(result.message).toMatch(/timed out/i)
    expect(result.message).toMatch(/retry/i)
  })
})
