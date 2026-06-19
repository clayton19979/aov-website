// EVE Frontier runs on Sui Testnet.
// GraphQL endpoint: https://graphql.testnet.sui.io/graphql
//
// Package IDs per game server (from @evefrontier/dapp-kit constants):
//   STILLNESS (live):  0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c
//   UTOPIA (staging):  0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75
//
// Set NEXT_PUBLIC_EVE_PACKAGE_ID to override. Defaults to STILLNESS.

// Maximum time (ms) to wait for the Sui GraphQL endpoint before aborting.
// Keeps the login flow responsive when the RPC is slow or unreachable.
const SUI_GRAPHQL_TIMEOUT_MS = 10_000

const STILLNESS_PACKAGE_ID =
  '0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c'

const SUI_GRAPHQL_URL =
  process.env.NEXT_PUBLIC_SUI_GRAPHQL_URL ??
  'https://graphql.testnet.sui.io/graphql'

const REQUIRED_TRIBE_ID = Number(
  process.env.NEXT_PUBLIC_REQUIRED_TRIBE_ID ?? '1000167'
)

const TRIBE_NAMES: Record<number, string> = {
  1000167: 'Architects of the Void',
}

export function getTribeName(tribeId: number): string {
  return TRIBE_NAMES[tribeId] ?? `Tribe ${tribeId}`
}

export type TribeCheckResult =
  | { status: 'verified'; tribeId: number; characterId: number; tribeName: string; characterName: string }
  | { status: 'wrong-tribe'; tribeId: number; tribeName: string; characterName: string }
  | { status: 'no-character' }
  | { status: 'error'; message: string }

// Matches the GET_WALLET_CHARACTERS query from @evefrontier/dapp-kit
const GET_WALLET_CHARACTERS = `
  query GetWalletCharacters($owner: SuiAddress!, $characterPlayerProfileType: String!) {
    address(address: $owner) {
      objects(last: 1, filter: { type: $characterPlayerProfileType }) {
        nodes {
          contents {
            extract(path: "character_id") {
              asAddress {
                asObject {
                  asMoveObject {
                    contents {
                      type { repr }
                      json
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

function parseCharacter(json: unknown): {
  name: string
  tribeId: number
  characterId: number
} | null {
  if (json == null || typeof json !== 'object' || Array.isArray(json)) return null

  const obj = json as Record<string, unknown>

  const metadata =
    obj.metadata != null && typeof obj.metadata === 'object' && !Array.isArray(obj.metadata)
      ? (obj.metadata as Record<string, unknown>)
      : undefined

  const key =
    obj.key != null && typeof obj.key === 'object' && !Array.isArray(obj.key)
      ? (obj.key as Record<string, unknown>)
      : undefined

  const parsedInt = (v: unknown) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') { const n = parseInt(v, 10); return Number.isNaN(n) ? 0 : n }
    return 0
  }

  return {
    name: typeof metadata?.name === 'string' ? metadata.name : '',
    tribeId: parsedInt(obj.tribe_id),
    characterId: parsedInt(key?.item_id),
  }
}

export async function checkTribeMembership(walletAddress: string): Promise<TribeCheckResult> {
  try {
    const packageId = process.env.NEXT_PUBLIC_EVE_PACKAGE_ID || STILLNESS_PACKAGE_ID
    const playerProfileType = `${packageId}::character::PlayerProfile`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), SUI_GRAPHQL_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(SUI_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GET_WALLET_CHARACTERS,
          variables: { owner: walletAddress, characterPlayerProfileType: playerProfileType },
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`)

    const data = await res.json()

    const nodes: unknown[] = data?.data?.address?.objects?.nodes ?? []

    if (!nodes.length) return { status: 'no-character' }

    const node = nodes[0] as Record<string, unknown>
    const characterJson =
      (node?.contents as Record<string, unknown>)
        ?.extract as Record<string, unknown>
    const json =
      (characterJson?.asAddress as Record<string, unknown>)
        ?.asObject as Record<string, unknown>
    const character = parseCharacter(
      ((json?.asMoveObject as Record<string, unknown>)
        ?.contents as Record<string, unknown>)?.json
    )

    if (!character) return { status: 'no-character' }

    const { tribeId, characterId, name: characterName } = character

    if (tribeId === REQUIRED_TRIBE_ID) {
      return {
        status: 'verified',
        tribeId,
        characterId,
        tribeName: getTribeName(tribeId),
        characterName,
      }
    }

    return {
      status: 'wrong-tribe',
      tribeId,
      tribeName: getTribeName(tribeId),
      characterName,
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        status: 'error',
        message: `Verification timed out after ${SUI_GRAPHQL_TIMEOUT_MS / 1000}s — the Sui network may be slow. Please retry.`,
      }
    }
    return { status: 'error', message: String(err) }
  }
}
