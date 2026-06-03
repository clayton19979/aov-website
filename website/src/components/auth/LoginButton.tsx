'use client'

import { useEffect, useState } from 'react'
import {
  useDAppKit,
  useWallets,
  useCurrentAccount,
} from '@mysten/dapp-kit-react'
import { checkTribeMembership } from '@/lib/tribe'
import { useRouter, useSearchParams } from 'next/navigation'

type AuthState =
  | 'idle'           // not connected
  | 'connecting'     // waiting for wallet modal
  | 'checking-tribe' // querying on-chain
  | 'creating-session' // calling /api/auth/verify
  | 'verified'       // done
  | 'wrong-tribe'
  | 'no-character'
  | 'error'

export function LoginButton() {
  const dAppKit = useDAppKit()
  const wallets = useWallets()
  const account = useCurrentAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/hub'

  const [state, setState] = useState<AuthState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [tribeName, setTribeName] = useState('')
  const [characterName, setCharacterName] = useState('')

  // Phase 2: once account appears (after wallet connection), auto-proceed
  useEffect(() => {
    if (state !== 'connecting' || !account?.address) return
    verifyTribe(account.address)
  }, [account?.address, state]) // eslint-disable-line react-hooks/exhaustive-deps

  async function verifyTribe(address: string) {
    try {
      setState('checking-tribe')
      const result = await checkTribeMembership(address)

      if (result.status === 'no-character') {
        setState('no-character')
        return
      }
      if (result.status === 'wrong-tribe') {
        setCharacterName(result.characterName)
        setTribeName(result.tribeName)
        setState('wrong-tribe')
        return
      }
      if (result.status === 'error') {
        setErrorMessage(result.message)
        setState('error')
        return
      }

      // Tribe confirmed — create server session
      setCharacterName(result.characterName)
      setTribeName(result.tribeName)
      setState('creating-session')

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          tribeId: result.tribeId,
          characterName: result.characterName,
          characterId: result.characterId,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Session creation failed')
      }

      setState('verified')
      setTimeout(() => router.push(nextPath), 1200)
    } catch (err) {
      setErrorMessage(String(err))
      setState('error')
    }
  }

  async function handleConnect() {
    try {
      setState('connecting')

      // If already connected, go straight to tribe check
      if (account?.address) {
        verifyTribe(account.address)
        return
      }

      const eveVault =
        wallets.find(
          w => w.name.toLowerCase().includes('eve') || w.name.toLowerCase().includes('vault')
        ) ?? wallets[0]

      if (!eveVault) {
        setErrorMessage('EVE Vault not found. Install the EVE Vault browser extension.')
        setState('error')
        return
      }

      // connectWallet is async in v2 and throws on failure
      await dAppKit.connectWallet({ wallet: eveVault })
    } catch (err) {
      setErrorMessage(String(err))
      setState('error')
    }
  }

  function reset() {
    setState('idle')
    setErrorMessage('')
    setCharacterName('')
    setTribeName('')
  }

  // ─── Outcome states ───────────────────────────────────────────────────────

  if (state === 'verified') {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
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
          <span className="font-mono text-sm tracking-widest uppercase text-white/50">
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
          onClick={reset}
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
          No EVE Frontier character was found linked to this wallet.
        </p>
        <button
          onClick={reset}
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
        <p className="font-mono text-xs text-white/20 max-w-xs leading-relaxed break-all">
          {errorMessage || 'An error occurred during verification.'}
        </p>
        <button
          onClick={reset}
          className="font-mono text-xs tracking-widest uppercase text-void-teal/50 hover:text-void-teal transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // ─── Button states ────────────────────────────────────────────────────────

  const isLoading = ['connecting', 'checking-tribe', 'creating-session'].includes(state)

  const label: Record<AuthState, string> = {
    idle: 'Connect EVE Vault',
    connecting: 'Connecting...',
    'checking-tribe': 'Verifying membership...',
    'creating-session': 'Confirmed — entering...',
    verified: '',
    'wrong-tribe': '',
    'no-character': '',
    error: '',
  }

  return (
    <button
      onClick={handleConnect}
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
        <span className="w-2 h-2 rounded-full bg-void-teal/60 animate-pulse shrink-0" />
      )}
      {label[state]}
    </button>
  )
}
