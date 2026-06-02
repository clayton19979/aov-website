'use client'

import { useState } from 'react'
import {
  useCurrentAccount,
  useSignPersonalMessage,
  useConnectWallet,
  useWallets,
} from '@mysten/dapp-kit'
import { checkTribeMembership } from '@/lib/tribe'
import { useRouter } from 'next/navigation'

type AuthState =
  | 'idle'
  | 'connecting'
  | 'checking-tribe'
  | 'signing'
  | 'verified'
  | 'wrong-tribe'
  | 'no-character'
  | 'error'

export function LoginButton() {
  const account = useCurrentAccount()
  const wallets = useWallets()
  const { mutateAsync: connectWallet } = useConnectWallet()
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()
  const router = useRouter()
  const [state, setState] = useState<AuthState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [tribeName, setTribeName] = useState('')
  const [characterName, setCharacterName] = useState('')

  async function handleLogin() {
    try {
      // Step 1: Connect wallet if not connected
      if (!account) {
        setState('connecting')
        const eveVault = wallets.find(w =>
          w.name.toLowerCase().includes('eve') || w.name.toLowerCase().includes('vault')
        ) ?? wallets[0]

        if (!eveVault) {
          setErrorMessage('EVE Vault not found. Install the EVE Vault browser extension.')
          setState('error')
          return
        }
        await connectWallet({ wallet: eveVault })
      }

      const address = account?.address
      if (!address) {
        setState('error')
        setErrorMessage('Could not get wallet address.')
        return
      }

      // Step 2: Check tribe on-chain
      setState('checking-tribe')
      const result = await checkTribeMembership(address)

      if (result.status === 'no-character') {
        setState('no-character')
        return
      }
      if (result.status === 'wrong-tribe') {
        setTribeName(result.tribeName)
        setCharacterName(result.characterName)
        setState('wrong-tribe')
        return
      }
      if (result.status === 'error') {
        setState('error')
        setErrorMessage(result.message)
        return
      }

      // Capture character info before signing
      setTribeName(result.tribeName)
      setCharacterName(result.characterName)

      // Step 3: Sign a message to prove wallet ownership
      setState('signing')
      const message = `AoV access request — ${address} — ${Date.now()}`
      const { signature } = await signPersonalMessage({
        message: new TextEncoder().encode(message),
      })

      // Step 4: Create server session
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          message,
          signature,
          tribeId: result.tribeId,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Session creation failed')
      }

      setState('verified')
      setTimeout(() => router.push('/hub'), 800)
    } catch (err) {
      setState('error')
      setErrorMessage(String(err))
    }
  }

  if (state === 'verified') {
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-xs tracking-widest uppercase text-void-teal">
          ◈ IDENTITY CONFIRMED
        </span>
        {characterName && (
          <span className="font-mono text-lg tracking-widest uppercase text-white/80">
            {characterName}
          </span>
        )}
        {tribeName && (
          <span className="font-mono text-xs tracking-widest uppercase text-void-teal/60">
            {tribeName}
          </span>
        )}
        <span className="font-mono text-xs text-white/30 mt-1">Entering the order...</span>
      </div>
    )
  }

  if (state === 'wrong-tribe') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="font-mono text-xs tracking-widest uppercase text-white/40">
          ACCESS DENIED
        </span>
        {characterName && (
          <span className="font-mono text-sm tracking-widest uppercase text-white/40">
            {characterName}
          </span>
        )}
        {tribeName && (
          <span className="font-mono text-xs tracking-widest uppercase text-white/20">
            {tribeName}
          </span>
        )}
        <p className="font-mono text-xs text-white/25 max-w-xs leading-relaxed">
          This character does not belong to the Architects of the Void.
          The Void does not receive you here.
        </p>
        <button
          onClick={() => setState('idle')}
          className="font-mono text-xs tracking-widest uppercase text-void-teal/50 hover:text-void-teal transition-colors"
        >
          Try another wallet
        </button>
      </div>
    )
  }

  if (state === 'no-character') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="font-mono text-xs tracking-widest uppercase text-white/40">
          NO CHARACTER FOUND
        </span>
        <p className="font-mono text-xs text-white/25 max-w-xs leading-relaxed">
          No EVE Frontier character was found in this wallet.
        </p>
        <button
          onClick={() => setState('idle')}
          className="font-mono text-xs tracking-widest uppercase text-void-teal/50 hover:text-void-teal transition-colors"
        >
          Try another wallet
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="font-mono text-xs tracking-widest uppercase text-white/40">
          SIGNAL LOST
        </span>
        <p className="font-mono text-xs text-white/20 max-w-xs leading-relaxed">
          {errorMessage || 'An error occurred during verification.'}
        </p>
        <button
          onClick={() => setState('idle')}
          className="font-mono text-xs tracking-widest uppercase text-void-teal/50 hover:text-void-teal transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const stateLabels: Record<AuthState, string> = {
    idle: 'Connect EVE Vault',
    connecting: 'Connecting...',
    'checking-tribe': 'Verifying membership...',
    signing: 'Sign to confirm identity...',
    verified: 'Verified',
    'wrong-tribe': '',
    'no-character': '',
    error: '',
  }

  const isLoading = ['connecting', 'checking-tribe', 'signing'].includes(state)

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className={`
        group inline-flex items-center gap-3
        border px-8 py-3
        font-mono text-xs tracking-widest uppercase
        transition-all duration-300
        ${isLoading
          ? 'border-void-teal/20 text-void-teal/40 cursor-wait'
          : 'border-void-teal/50 hover:border-void-teal text-void-teal hover:text-void-black hover:bg-void-teal'
        }
      `}
    >
      {isLoading && (
        <span className="w-2 h-2 rounded-full bg-void-teal/60 animate-pulse" />
      )}
      {stateLabels[state]}
    </button>
  )
}
