'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from '@mysten/dapp-kit'
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc'
// Note: dapp-kit CSS import removed — conflicts with Tailwind v4 styles

const { networkConfig } = createNetworkConfig({
  mainnet: { url: getJsonRpcFullnodeUrl('mainnet'), network: 'mainnet' as const },
  testnet: { url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' as const },
})

const queryClient = new QueryClient()

export function SuiProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork={(process.env.NEXT_PUBLIC_SUI_NETWORK as 'mainnet' | 'testnet') ?? 'mainnet'}
      >
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
