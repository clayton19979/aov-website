'use client'

import { useState } from 'react'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    if (loading) return
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/'
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`font-mono text-xs tracking-widest uppercase transition-colors ${
        loading
          ? 'text-white/10 cursor-wait'
          : 'text-white/15 hover:text-white/40'
      }`}
    >
      {loading ? 'EXITING...' : 'EXIT'}
    </button>
  )
}
