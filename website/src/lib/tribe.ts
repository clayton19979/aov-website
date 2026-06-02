import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc'

const REQUIRED_TRIBE_ID = Number(process.env.NEXT_PUBLIC_REQUIRED_TRIBE_ID ?? '1000167')
const PACKAGE_ID = process.env.NEXT_PUBLIC_EVE_PACKAGE_ID ?? ''

const TRIBE_NAMES: Record<number, string> = {
  1000167: 'Architects of the Void',
}

export function getTribeName(tribeId: number): string {
  return TRIBE_NAMES[tribeId] ?? `Tribe ${tribeId}`
}

export type TribeCheckResult =
  | { status: 'verified'; tribeId: number; characterId: string; tribeName: string }
  | { status: 'wrong-tribe'; tribeId: number; tribeName: string }
  | { status: 'no-character' }
  | { status: 'error'; message: string }

export async function checkTribeMembership(walletAddress: string): Promise<TribeCheckResult> {
  try {
    const network = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'mainnet' | 'testnet') ?? 'mainnet'
    const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network })

    if (!PACKAGE_ID) {
      // Fallback: query all owned objects and look for PlayerProfile by name
      // This is less efficient but works without knowing the exact package ID
      const allObjects = await client.getOwnedObjects({
        owner: walletAddress,
        options: { showContent: true, showType: true },
      })

      const profile = allObjects.data.find(obj => {
        const type = obj.data?.type ?? ''
        return type.includes('PlayerProfile') || type.includes('smart_character')
      })

      if (!profile?.data?.content || profile.data.content.dataType !== 'moveObject') {
        return { status: 'no-character' }
      }

      const fields = profile.data.content.fields as Record<string, unknown>
      const tribeId = Number(fields.tribe ?? fields.tribe_id ?? 0)
      const characterId = String(fields.character_id ?? '')

      if (tribeId === REQUIRED_TRIBE_ID) {
        return { status: 'verified', tribeId, characterId, tribeName: getTribeName(tribeId) }
      }
      return { status: 'wrong-tribe', tribeId, tribeName: getTribeName(tribeId) }
    }

    // With known package ID: query PlayerProfile specifically
    const objects = await client.getOwnedObjects({
      owner: walletAddress,
      filter: {
        StructType: `${PACKAGE_ID}::smart_character::PlayerProfile`,
      },
      options: { showContent: true },
    })

    if (!objects.data.length) {
      return { status: 'no-character' }
    }

    const profile = objects.data[0]
    if (!profile.data?.content || profile.data.content.dataType !== 'moveObject') {
      return { status: 'no-character' }
    }

    const fields = profile.data.content.fields as Record<string, unknown>
    const tribeId = Number(fields.tribe ?? fields.tribe_id ?? 0)
    const characterId = String(fields.character_id ?? '')

    if (tribeId === REQUIRED_TRIBE_ID) {
      return { status: 'verified', tribeId, characterId, tribeName: getTribeName(tribeId) }
    }
    return { status: 'wrong-tribe', tribeId, tribeName: getTribeName(tribeId) }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}
