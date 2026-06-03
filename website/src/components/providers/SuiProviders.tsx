'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DAppKitProvider, createDAppKit } from '@mysten/dapp-kit-react'
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc'
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc'

const queryClient = new QueryClient()

const dAppKit = createDAppKit({
  networks: ['testnet'] as const,
  createClient(network) {
    return new SuiJsonRpcClient({
      network,
      url: getJsonRpcFullnodeUrl('testnet'),
    })
  },
  defaultNetwork: 'testnet',
  slushWalletConfig: null,
})

export function SuiProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        {children}
      </DAppKitProvider>
    </QueryClientProvider>
  )
}
